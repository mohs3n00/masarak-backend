// Manually trigger lesson summary jobs for stuck lessons
const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

async function triggerJob(lessonId, teacherId, videoUrl) {
  console.log('\nTriggering job for lesson:', lessonId);
  console.log('  Video:', videoUrl.slice(0, 60));

  const res = await fetch(`http://localhost:4000/api/lesson-summary/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Internal call - need teacher auth token or use a backdoor endpoint
    },
    body: JSON.stringify({ lessonId, videoUrl }),
  });
  const data = await res.json();
  console.log('  Response:', JSON.stringify(data));
}

async function main() {
  const { documents } = await db.listDocuments('masarak_community', 'Lessons');
  console.log(`Found ${documents.length} stuck lessons`);

  for (const lesson of documents) {
    if (lesson.status === 'Pending' && !lesson.lastJobId) {
      console.log('\n>>> Lesson', lesson.lessonId, 'is stuck - checking Prisma for teacher...');

      // Try to trigger via the admin/retry endpoint
      try {
        const retryRes = await fetch(`http://localhost:4000/api/lesson-summary/${lesson.lessonId}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        console.log('  Retry status:', retryRes.status);
        const data = await retryRes.json();
        console.log('  Response:', JSON.stringify(data));
      } catch (e) {
        console.log('  Error:', e.message);
      }
    }
  }
}
main().catch(console.error);
