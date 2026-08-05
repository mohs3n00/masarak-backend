const { Client, Databases, Query } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });
const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

async function main() {
  console.log('=== Recent AIJobs ===');
  const { documents: jobs } = await db.listDocuments('masarak_community', 'AIJobs', [
    Query.orderDesc('createdAt'),
    Query.limit(5)
  ]);
  jobs.forEach(j => {
    console.log('jobId:', j.jobId?.slice(0,8), '| status:', j.status, '| stage:', j.stage, '| error:', j.errorMessage);
  });

  console.log('\n=== Recent Logs ===');
  const { documents: logs } = await db.listDocuments('masarak_community', 'Logs', [
    Query.orderDesc('createdAt'),
    Query.limit(10)
  ]);
  logs.forEach(l => {
    console.log(`[${l.level}] ${l.lessonId?.slice(0,8)} - ${l.message}`);
    if (l.metadata && l.level === 'error') console.log('  ', l.metadata.slice(0,200));
  });

  console.log('\n=== Recent Outputs ===');
  const { documents: outputs } = await db.listDocuments('masarak_community', 'AIOutputs', [
    Query.orderDesc('createdAt'),
    Query.limit(5)
  ]);
  outputs.forEach(o => {
    console.log(`Key: ${o.key} | URL: ${o.url || 'none'}`);
  });

}
main().catch(console.error);
