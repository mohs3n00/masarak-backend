const { Queue } = require('bullmq');
const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });
const crypto = require('crypto');

// BullMQ Queue
const queue = new Queue('lesson_summary_queue', {
  connection: {
    host: (process.env.REDIS_HOST || 'localhost').replace(/^https?:\/\//, ''),
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
  },
});

// Appwrite
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

const DB_ID = 'masarak_community';
const COLLECTIONS = {
  LESSONS: 'Lessons',
  AI_JOBS: 'AIJobs',
};

// 5 Sample Educational Videos for Stress Testing
const VIDEOS = [
  'https://www.youtube.com/watch?v=kYjNjUq2g8w', // Video 1
  'https://www.youtube.com/watch?v=30WJzL-a8yE', // Video 2
  'https://www.youtube.com/watch?v=0hJW2Gz36qE', // Video 3
  'https://www.youtube.com/watch?v=6rG7i-zZXYU', // Video 4
  'https://www.youtube.com/watch?v=kYjNjUq2g8w', // Video 5 (Duplicate to test cache overlapping)
];

async function generateTestLessons() {
  console.log(`🚀 Starting Stress Test with ${VIDEOS.length} Concurrent Jobs...`);
  const jobsTracker = [];

  for (let i = 0; i < VIDEOS.length; i++) {
    const videoUrl = VIDEOS[i];
    const lessonId = ID.unique();
    const jobId = crypto.randomUUID();

    console.log(`[+] Creating Fake Lesson ${i+1}: ${lessonId}`);

    // Create Lesson
    await db.createDocument(DB_ID, COLLECTIONS.LESSONS, lessonId, {
      lessonId: lessonId,
      teacherId: 'stress-test-user',
      videoUrl: videoUrl,
      status: 'Pending',
      summaryStatus: 'Pending',
      designVersion: '1.0',
      version: 'v1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create AI Job
    await db.createDocument(DB_ID, COLLECTIONS.AI_JOBS, jobId, {
      lessonId: lessonId,
      jobId: jobId,
      status: 'Pending',
      stage: null,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Enqueue in BullMQ
    await queue.add('process_summary', {
      lessonId,
      jobId,
      videoUrl,
      designVersion: '1.0',
      teacherId: 'stress-test-user'
    });

    jobsTracker.push({ lessonId, jobId });
    console.log(`   -> Queued Job ${jobId}`);
  }

  console.log(`\n⏳ All ${VIDEOS.length} jobs have been successfully queued.`);
  console.log(`To monitor progress, run: node scripts/check-latest-status.js`);
  
  process.exit(0);
}

generateTestLessons().catch(err => {
  console.error("Stress test failed to start:", err);
  process.exit(1);
});
