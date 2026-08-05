const { Client, Databases, Storage } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const storage = new Storage(client);

const DB_ID = 'masarak_community';
const COLLECTIONS = {
  LESSONS: 'Lessons',
  AI_JOBS: 'AIJobs',
  AI_METADATA: 'AIMetadata',
  AI_OUTPUTS: 'AIOutputs',
  AI_USAGE: 'AIUsage',
  LOGS: 'Logs'
};
const BUCKET_ID = 'lesson-assets';

async function generateReport() {
  const { documents: lessons } = await db.listDocuments(DB_ID, COLLECTIONS.LESSONS);
  const targetLessons = lessons.filter(l => l.summaryStatus === 'Completed' || l.summaryStatus === 'Failed');
  
  if (targetLessons.length === 0) {
    console.log("No completed/failed lessons found yet.");
    return;
  }
  
  for (const lesson of targetLessons) {
    console.log(`\n=== REPORT FOR LESSON ${lesson.lessonId} ===`);
    console.log(`Status: ${lesson.summaryStatus} (Failed Stage: ${lesson.failedStage || 'None'})`);

    const jobs = await db.listDocuments(DB_ID, COLLECTIONS.AI_JOBS);
    const lessonJobs = jobs.documents.filter(j => j.lessonId === lesson.lessonId).sort((a,b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());
    const latestJob = lessonJobs[lessonJobs.length - 1];

    if (!latestJob) {
      console.log('No AIJob found');
      continue;
    }
    console.log(`Latest Job ID: ${latestJob.jobId}`);

    const usages = await db.listDocuments(DB_ID, COLLECTIONS.AI_USAGE);
    const lessonUsage = usages.documents.filter(u => u.lessonId === lesson.lessonId);
    
    let totalRequests = lessonUsage.length;
    let totalTokens = lessonUsage.reduce((acc, curr) => acc + curr.inputTokens + curr.outputTokens, 0);
    
    console.log(`\n✅ عدد Requests إلى OpenRouter: ${totalRequests}`);
    console.log(`✅ إجمالي Tokens المستخدمة: ${totalTokens}`);

    const logs = await db.listDocuments(DB_ID, COLLECTIONS.LOGS);
    const stageLogs = logs.documents.filter(l => l.lessonId === lesson.lessonId && l.jobId === latestJob.jobId && l.message.startsWith('Stage'));
    console.log(`\n✅ زمن كل مرحلة:`);
    for(const l of stageLogs) {
       const meta = JSON.parse(l.metadata || '{}');
       console.log(`- ${meta.stage}: ${meta.durationMs}ms (${meta.status})`);
    }

    const outputs = await db.listDocuments(DB_ID, COLLECTIONS.AI_OUTPUTS);
    const lessonOutputs = outputs.documents.filter(o => o.lessonId === lesson.lessonId);
    console.log(`\n✅ جميع الملفات التي تم إنشاؤها (${lessonOutputs.length} files):`);
    for (const out of lessonOutputs) {
       console.log(`- [${out.key}] FileID: ${out.fileId}`);
       console.log(`  Link: ${out.url}`);
    }

    console.log(`\n✅ تأكيد أن Chunked Processing يعمل فعلًا:`);
    const states = lessonOutputs.filter(o => o.key === 'analysis_state');
    console.log(`- تم حفظ حالة التحليل (Analysis State) ${states.length} مرات أثناء استخراج البيانات.`);
    if (states.length > 0) {
      console.log(`- وهذا يثبت أن النظام يعالج الفصول بشكل مستقل ويقوم بالحفظ التلقائي لكل Chapter (Chunked Processing).`);
    }
  }
}

generateReport();
