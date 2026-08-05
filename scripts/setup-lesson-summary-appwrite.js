// Setup script for Lesson Summary Appwrite collections
const { Client, Databases, Storage } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'masarak_community';
const BUCKET_ID = process.env.APPWRITE_LESSON_BUCKET_ID || 'lesson-assets';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryCreate(fn, label) {
  try {
    const result = await fn();
    console.log(`  ✅ ${label}`);
    return result;
  } catch (err) {
    if (err.code === 409) {
      console.log(`  ⚠️  ${label} (already exists)`);
    } else {
      console.log(`  ❌ ${label}: ${err.message}`);
    }
  }
}

async function createCollection(id, name) {
  return tryCreate(
    () => databases.createCollection(DATABASE_ID, id, name, [
      'read("any")', 'create("any")', 'update("any")', 'delete("any")'
    ]),
    `Collection: ${name} (${id})`
  );
}

async function createStr(collId, key, size = 255, required = false) {
  await sleep(300);
  return tryCreate(
    () => databases.createStringAttribute(DATABASE_ID, collId, key, size, required),
    `  attr: ${key} (string${required ? ', required' : ''})`
  );
}

async function createInt(collId, key, required = false, defaultVal = null) {
  await sleep(300);
  return tryCreate(
    () => databases.createIntegerAttribute(DATABASE_ID, collId, key, required, null, null, defaultVal),
    `  attr: ${key} (integer)`
  );
}

async function createBool(collId, key, required = false) {
  await sleep(300);
  return tryCreate(
    () => databases.createBooleanAttribute(DATABASE_ID, collId, key, required),
    `  attr: ${key} (boolean)`
  );
}

async function createIndex(collId, indexKey, type, attributes) {
  await sleep(500);
  return tryCreate(
    () => databases.createIndex(DATABASE_ID, collId, indexKey, type, attributes),
    `  index: ${indexKey}`
  );
}

async function main() {
  console.log('🚀 Setting up Lesson Summary Appwrite Collections');
  console.log(`   Database: ${DATABASE_ID}`);
  console.log(`   Bucket: ${BUCKET_ID}`);
  console.log('');

  // ── 1. Lessons ──────────────────────────────────────────────────────────
  console.log('\n📋 Creating Lessons collection...');
  await createCollection('Lessons', 'Lessons');
  await sleep(1000);
  await createStr('Lessons', 'lessonId', 100, true);
  await createStr('Lessons', 'teacherId', 100, true);
  await createStr('Lessons', 'videoUrl', 2000, true);
  await createStr('Lessons', 'status', 50, true);
  await createStr('Lessons', 'summaryStatus', 50, true);
  await createStr('Lessons', 'pdfUrl', 2000, false);
  await createStr('Lessons', 'htmlUrl', 2000, false);
  await createStr('Lessons', 'jsonUrl', 2000, false);
  await createStr('Lessons', 'failedStage', 50, false);
  await createStr('Lessons', 'version', 50, true);
  await createStr('Lessons', 'designVersion', 50, true);
  await createStr('Lessons', 'lastJobId', 100, false);
  await createStr('Lessons', 'latestArtifactVersion', 100, false);
  await createStr('Lessons', 'createdAt', 50, true);
  await createStr('Lessons', 'updatedAt', 50, true);
  await sleep(1000);
  await createIndex('Lessons', 'idx_lessonId', 'key', ['lessonId']);
  await createIndex('Lessons', 'idx_teacherId', 'key', ['teacherId']);
  await createIndex('Lessons', 'idx_status', 'key', ['status']);

  // ── 2. AIJobs ───────────────────────────────────────────────────────────
  console.log('\n📋 Creating AIJobs collection...');
  await createCollection('AIJobs', 'AIJobs');
  await sleep(1000);
  await createStr('AIJobs', 'jobId', 100, true);
  await createStr('AIJobs', 'lessonId', 100, true);
  await createStr('AIJobs', 'status', 50, true);
  await createStr('AIJobs', 'stage', 50, false);
  await createInt('AIJobs', 'retries', true, 0);
  await createStr('AIJobs', 'requestHash', 255, false);
  await createStr('AIJobs', 'errorMessage', 2000, false);
  await createStr('AIJobs', 'startedAt', 50, false);
  await createStr('AIJobs', 'finishedAt', 50, false);
  await createStr('AIJobs', 'createdAt', 50, true);
  await createStr('AIJobs', 'updatedAt', 50, true);
  await sleep(1000);
  await createIndex('AIJobs', 'idx_lessonId', 'key', ['lessonId']);
  await createIndex('AIJobs', 'idx_status', 'key', ['status']);
  await createIndex('AIJobs', 'idx_requestHash', 'key', ['requestHash']);

  // ── 3. AIOutputs ────────────────────────────────────────────────────────
  console.log('\n📋 Creating AIOutputs collection...');
  await createCollection('AIOutputs', 'AIOutputs');
  await sleep(1000);
  await createStr('AIOutputs', 'lessonId', 100, true);
  await createStr('AIOutputs', 'key', 100, true);
  await createStr('AIOutputs', 'artifactVersion', 100, false);
  await createStr('AIOutputs', 'fileId', 100, false);
  await createStr('AIOutputs', 'path', 500, false);
  await createStr('AIOutputs', 'url', 2000, false);
  await createStr('AIOutputs', 'payloadJson', 65535, false);
  await createStr('AIOutputs', 'createdAt', 50, true);
  await createStr('AIOutputs', 'updatedAt', 50, true);
  await sleep(1000);
  await createIndex('AIOutputs', 'idx_lessonId', 'key', ['lessonId']);
  await createIndex('AIOutputs', 'idx_lessonId_key', 'key', ['lessonId', 'key']);

  // ── 4. AIMetadata ───────────────────────────────────────────────────────
  console.log('\n📋 Creating AIMetadata collection...');
  await createCollection('AIMetadata', 'AIMetadata');
  await sleep(1000);
  await createStr('AIMetadata', 'cacheHash', 255, true);
  await createStr('AIMetadata', 'type', 100, true);
  await createStr('AIMetadata', 'lessonId', 100, false);
  await createStr('AIMetadata', 'payloadJson', 65535, true);
  await createStr('AIMetadata', 'model', 255, false);
  await createStr('AIMetadata', 'promptVersion', 100, false);
  await createStr('AIMetadata', 'createdAt', 50, true);
  await createStr('AIMetadata', 'updatedAt', 50, true);
  await sleep(1000);
  await createIndex('AIMetadata', 'idx_cacheHash', 'key', ['cacheHash']);
  await createIndex('AIMetadata', 'idx_lessonId', 'key', ['lessonId']);

  // ── 5. AIUsage ──────────────────────────────────────────────────────────
  console.log('\n📋 Creating AIUsage collection...');
  await createCollection('AIUsage', 'AIUsage');
  await sleep(1000);
  await createStr('AIUsage', 'lessonId', 100, true);
  await createStr('AIUsage', 'jobId', 100, true);
  await createStr('AIUsage', 'agentName', 100, true);
  await createStr('AIUsage', 'aiModel', 255, true);
  await createStr('AIUsage', 'promptVersion', 100, false);
  await createInt('AIUsage', 'inputTokens', false, 0);
  await createInt('AIUsage', 'outputTokens', false, 0);
  await createStr('AIUsage', 'estimatedCost', 50, false);
  await createInt('AIUsage', 'executionTimeMs', false, 0);
  await createInt('AIUsage', 'retryCount', false, 0);
  await createStr('AIUsage', 'status', 50, true);
  await createStr('AIUsage', 'createdAt', 50, true);
  await sleep(1000);
  await createIndex('AIUsage', 'idx_lessonId', 'key', ['lessonId']);
  await createIndex('AIUsage', 'idx_jobId', 'key', ['jobId']);

  // ── 6. Logs ─────────────────────────────────────────────────────────────
  console.log('\n📋 Creating Logs collection...');
  await createCollection('Logs', 'Logs');
  await sleep(1000);
  await createStr('Logs', 'lessonId', 100, true);
  await createStr('Logs', 'jobId', 100, false);
  await createStr('Logs', 'level', 20, true);
  await createStr('Logs', 'message', 500, true);
  await createStr('Logs', 'metadata', 5000, false);
  await createStr('Logs', 'createdAt', 50, true);
  await sleep(1000);
  await createIndex('Logs', 'idx_lessonId', 'key', ['lessonId']);

  // ── 7. Storage Bucket ───────────────────────────────────────────────────
  console.log('\n📦 Creating Storage Bucket...');
  await tryCreate(
    () => storage.createBucket(BUCKET_ID, 'Lesson Assets', [
      'read("any")', 'create("any")', 'update("any")', 'delete("any")'
    ], true, undefined, 100 * 1024 * 1024),
    `Bucket: ${BUCKET_ID}`
  );

  console.log('\n✅ Setup complete!');
  console.log('\nNext: Add these to your .env.development:');
  console.log(`APPWRITE_LESSON_COLLECTION_ID=Lessons`);
  console.log(`APPWRITE_AI_JOBS_COLLECTION_ID=AIJobs`);
  console.log(`APPWRITE_AI_OUTPUTS_COLLECTION_ID=AIOutputs`);
  console.log(`APPWRITE_AI_METADATA_COLLECTION_ID=AIMetadata`);
  console.log(`APPWRITE_AI_USAGE_COLLECTION_ID=AIUsage`);
  console.log(`APPWRITE_AI_LOGS_COLLECTION_ID=Logs`);
  console.log(`APPWRITE_LESSON_BUCKET_ID=${BUCKET_ID}`);
}

main().catch(console.error);
