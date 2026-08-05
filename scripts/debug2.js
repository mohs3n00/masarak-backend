const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });
const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

async function main() {
  const { documents } = await db.listDocuments('masarak_community', 'Lessons');
  documents.forEach(d => {
    console.log('=== Lesson ID (doc):', d['$id']);
    console.log('  lessonId field:', d.lessonId);
    console.log('  status:', d.status);
    console.log('  failedStage:', d.failedStage || 'none');
    console.log('  lastJobId:', d.lastJobId || 'none');
    console.log('  videoUrl:', (d.videoUrl || '').slice(0, 80));
    console.log('');
  });

  console.log('=== AIJobs ===');
  const { documents: jobs } = await db.listDocuments('masarak_community', 'AIJobs');
  jobs.forEach(j => {
    const err = j.errorMessage ? j.errorMessage.slice(0, 100) : 'none';
    console.log('  ' + (j.jobId || '').slice(0,8) + ' | lesson:' + (j.lessonId || '').slice(0,8) + ' | status:' + j.status + ' | stage:' + (j.stage || '-') + ' | err:' + err);
  });
}
main().catch(console.error);
