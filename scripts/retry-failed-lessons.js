// Retry failed lessons directly via BullMQ
const { Client, Databases } = require('node-appwrite');
const { Queue } = require('bullmq');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: '.env.development' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

const redisHost = (process.env.REDIS_HOST || 'localhost').replace('https://', '').replace('http://', '');
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;
const redisTls = (process.env.REDIS_HOST || '').startsWith('https') ? {} : undefined;

const queue = new Queue('lesson_summary_queue', {
  connection: { host: redisHost, port: redisPort, password: redisPassword, tls: redisTls }
});

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const { documents: lessons } = await db.listDocuments('masarak_community', 'Lessons');
  const toRetry = lessons.filter(l => l.status === 'Failed' || l.status === 'Pending');

  console.log(`Found ${toRetry.length} lesson(s) to retry`);

  for (const lesson of toRetry) {
    const jobId = randomUUID();
    console.log('\n>>> Retrying lesson:', lesson.lessonId);
    console.log('  Previous status:', lesson.status, '| failedStage:', lesson.failedStage || 'none');

    // Reset lesson status
    try {
      await db.updateDocument('masarak_community', 'Lessons', lesson.lessonId, {
        status: 'Pending',
        summaryStatus: 'Pending',
        failedStage: null,
        lastJobId: jobId,
        updatedAt: new Date().toISOString(),
      });
      console.log('  ✅ Lesson reset to Pending');
    } catch (e) { console.log('  ❌ Update lesson:', e.message); continue; }

    // Create new AIJob
    try {
      await db.createDocument('masarak_community', 'AIJobs', jobId, {
        jobId,
        lessonId: lesson.lessonId,
        status: 'Pending',
        retries: 0,
        requestHash: `retry-${Date.now()}-${lesson.lessonId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('  ✅ New AIJob created');
    } catch (e) { console.log('  ❌ Create job:', e.message); continue; }

    // Push to BullMQ
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
      console.log('  ✅ Pushed to BullMQ queue');
    } catch (e) { console.log('  ❌ Queue:', e.message); }

    await sleep(500);
  }

  console.log('\n✅ All jobs re-triggered. Check status in ~5-10 min.');
  await queue.close();
}

main().catch(console.error);
