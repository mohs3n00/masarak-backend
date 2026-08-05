// Direct job trigger - bypasses HTTP auth, pushes directly to BullMQ queue
const { Client, Databases } = require('node-appwrite');
const { Queue } = require('bullmq');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: '.env.development' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

// Parse Redis URL
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;

const redisConfig = redisHost.startsWith('http')
  ? {
      host: redisHost.replace('https://', '').replace('http://', ''),
      port: redisPort,
      password: redisPassword,
      tls: redisHost.startsWith('https') ? {} : undefined,
    }
  : { host: redisHost, port: redisPort, password: redisPassword };

const queue = new Queue('lesson_summary_queue', { connection: redisConfig });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const { documents: lessons } = await db.listDocuments('masarak_community', 'Lessons');
  const stuck = lessons.filter(l => l.status === 'Pending' && !l.lastJobId);

  console.log(`Found ${stuck.length} stuck lesson(s) to trigger`);

  for (const lesson of stuck) {
    const jobId = randomUUID();
    console.log('\n>>> Processing lesson:', lesson.lessonId);
    console.log('  Video:', lesson.videoUrl.slice(0, 60));
    console.log('  Teacher:', lesson.teacherId);
    console.log('  New JobId:', jobId);

    // 1. Create AIJob record in Appwrite
    try {
      await db.createDocument('masarak_community', 'AIJobs', jobId, {
        jobId,
        lessonId: lesson.lessonId,
        status: 'Pending',
        retries: 0,
        requestHash: `manual-trigger-${lesson.lessonId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('  ✅ AIJob created in Appwrite');
    } catch (e) {
      console.log('  ❌ Failed to create AIJob:', e.message);
      continue;
    }

    // 2. Update Lesson with lastJobId
    try {
      await db.updateDocument('masarak_community', 'Lessons', lesson.lessonId, {
        lastJobId: jobId,
        updatedAt: new Date().toISOString(),
      });
      console.log('  ✅ Lesson updated with lastJobId');
    } catch (e) {
      console.log('  ❌ Failed to update lesson:', e.message);
    }

    // 3. Add to BullMQ queue
    try {
      await queue.add('lesson-summary', {
        lessonId: lesson.lessonId,
        jobId,
        requestedBy: lesson.teacherId,
      }, {
        jobId,
        attempts: 5,
        removeOnComplete: 100,
        removeOnFail: 100,
        backoff: { type: 'exponential', delay: 1000 },
      });
      console.log('  ✅ Job added to BullMQ queue');
    } catch (e) {
      console.log('  ❌ Failed to add to queue:', e.message);
    }

    await sleep(500);
  }

  console.log('\n✅ Done! Jobs are now in the queue.');
  console.log('   The backend worker will pick them up and process them.');
  await queue.close();
}

main().catch(console.error);
