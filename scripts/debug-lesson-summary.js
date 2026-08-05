// Quick debug script to check lesson summary status in Appwrite
const { Client, Databases, Storage } = require('node-appwrite');
require('dotenv').config({ path: '.env.development' });

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'masarak_community';
const BUCKET_ID = process.env.APPWRITE_LESSON_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || 'lesson-assets';
const LESSONS_COLLECTION = process.env.APPWRITE_LESSON_COLLECTION_ID || 'Lessons';

const LESSON_ID = '880e6e45-26d1-427a-8d5b-52f60a1c360d';

async function main() {
  console.log('=== Checking Appwrite Config ===');
  console.log('Database ID:', DATABASE_ID);
  console.log('Bucket ID:', BUCKET_ID);
  console.log('Lessons Collection:', LESSONS_COLLECTION);
  console.log('Lesson ID to check:', LESSON_ID);
  console.log('');

  // 1. Check if lesson summary exists
  console.log('=== Checking Lesson Summary ===');
  try {
    const doc = await databases.getDocument(DATABASE_ID, LESSONS_COLLECTION, LESSON_ID);
    console.log('✅ Lesson summary found!');
    console.log('Status:', doc.status);
    console.log('Summary Status:', doc.summaryStatus);
    console.log('PDF URL:', doc.pdfUrl || 'NOT SET');
    console.log('HTML URL:', doc.htmlUrl || 'NOT SET');
    console.log('Failed Stage:', doc.failedStage || 'none');
    console.log('Teacher ID:', doc.teacherId);
    console.log('Video URL:', doc.videoUrl);
    console.log('Design Version:', doc.designVersion);
    console.log('Version:', doc.version);
    console.log('Last Job ID:', doc.lastJobId || 'none');
  } catch (err) {
    console.log('❌ Lesson summary NOT found:', err.message);
  }

  // 2. List all lessons to see what exists
  console.log('\n=== All Lessons in Collection ===');
  try {
    const { documents } = await databases.listDocuments(DATABASE_ID, LESSONS_COLLECTION);
    console.log(`Found ${documents.length} lesson(s):`);
    documents.forEach(doc => {
      console.log(`  - ${doc.$id}: status=${doc.status}, pdfUrl=${doc.pdfUrl ? '✅' : '❌'}`);
    });
  } catch (err) {
    console.log('❌ Could not list lessons:', err.message);
    console.log('   This likely means the collection does not exist or wrong database ID');
  }

  // 3. List available databases
  console.log('\n=== Available Collections in Database ===');
  try {
    const { collections } = await databases.listCollections(DATABASE_ID);
    console.log(`Found ${collections.length} collection(s):`);
    collections.forEach(col => console.log(`  - ${col.$id}: ${col.name}`));
  } catch (err) {
    console.log('❌ Could not list collections:', err.message);
  }

  // 4. Check bucket
  console.log('\n=== Checking Storage Bucket ===');
  try {
    const { files } = await storage.listFiles(BUCKET_ID);
    console.log(`✅ Bucket exists with ${files.length} file(s)`);
    if (files.length > 0) {
      files.slice(0, 3).forEach(f => console.log(`  - ${f.$id}: ${f.name}`));
    }
  } catch (err) {
    console.log('❌ Bucket error:', err.message);
  }
}

main().catch(console.error);
