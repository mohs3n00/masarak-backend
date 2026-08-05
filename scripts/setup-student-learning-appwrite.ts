import * as dotenv from 'dotenv';
import { Client, Databases } from 'node-appwrite';

dotenv.config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'masarak_community';

if (!projectId || !apiKey) {
  throw new Error('APPWRITE_PROJECT_ID and APPWRITE_API_KEY are required');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Attribute = { key: string; kind: 'string' | 'integer' | 'boolean'; required: boolean; size?: number };
type Collection = { id: string; name: string; attributes: Attribute[]; indexes: Array<{ key: string; type: 'key' | 'unique'; fields: string[] }> };

const timestamp: Attribute[] = [
  { key: 'createdAt', kind: 'string', required: true, size: 50 },
  { key: 'updatedAt', kind: 'string', required: true, size: 50 },
];

const collections: Collection[] = [
  {
    id: 'LearningMaterials', name: 'Learning Materials',
    attributes: [
      { key: 'lessonId', kind: 'string', required: true, size: 100 }, { key: 'type', kind: 'string', required: true, size: 30 },
      { key: 'contentVersion', kind: 'string', required: true, size: 100 }, { key: 'promptVersion', kind: 'string', required: true, size: 100 },
      { key: 'payloadJson', kind: 'string', required: true, size: 50000 }, { key: 'createdAt', kind: 'string', required: true, size: 50 },
    ], indexes: [{ key: 'lesson_type_version', type: 'key', fields: ['lessonId', 'type', 'contentVersion'] }],
  },
  {
    id: 'LearningNotes', name: 'Learning Notes',
    attributes: [{ key: 'userId', kind: 'string', required: true, size: 100 }, { key: 'lessonId', kind: 'string', required: true, size: 100 }, { key: 'content', kind: 'string', required: true, size: 5000 }, { key: 'blockId', kind: 'string', required: false, size: 100 }, ...timestamp],
    indexes: [{ key: 'user_lesson', type: 'key', fields: ['userId', 'lessonId'] }],
  },
  {
    id: 'LearningBookmarks', name: 'Learning Bookmarks',
    attributes: [{ key: 'userId', kind: 'string', required: true, size: 100 }, { key: 'lessonId', kind: 'string', required: true, size: 100 }, { key: 'blockId', kind: 'string', required: false, size: 100 }, { key: 'title', kind: 'string', required: false, size: 200 }, ...timestamp],
    indexes: [{ key: 'user_lesson', type: 'key', fields: ['userId', 'lessonId'] }],
  },
  {
    id: 'LearningProgress', name: 'Learning Progress',
    attributes: [{ key: 'userId', kind: 'string', required: true, size: 100 }, { key: 'lessonId', kind: 'string', required: true, size: 100 }, { key: 'percent', kind: 'integer', required: true }, { key: 'completed', kind: 'boolean', required: true }, ...timestamp],
    indexes: [{ key: 'user_lesson_unique', type: 'unique', fields: ['userId', 'lessonId'] }],
  },
  {
    id: 'LearningAIUsage', name: 'Learning AI Usage',
    attributes: [{ key: 'userId', kind: 'string', required: true, size: 100 }, { key: 'lessonId', kind: 'string', required: true, size: 100 }, { key: 'feature', kind: 'string', required: true, size: 100 }, { key: 'promptVersion', kind: 'string', required: true, size: 100 }, { key: 'createdAt', kind: 'string', required: true, size: 50 }],
    indexes: [{ key: 'lesson_feature', type: 'key', fields: ['lessonId', 'feature'] }],
  },
];

async function ensureAttribute(collectionId: string, attribute: Attribute) {
  try {
    if (attribute.kind === 'string') await databases.createStringAttribute(databaseId, collectionId, attribute.key, attribute.size!, attribute.required);
    if (attribute.kind === 'integer') await databases.createIntegerAttribute(databaseId, collectionId, attribute.key, attribute.required);
    if (attribute.kind === 'boolean') await databases.createBooleanAttribute(databaseId, collectionId, attribute.key, attribute.required);
  } catch (error: any) {
    if (error.code !== 409) throw error;
  }
}

async function run() {
  for (const collection of collections) {
    try { await databases.getCollection(databaseId, collection.id); }
    catch (error: any) { if (error.code === 404) await databases.createCollection(databaseId, collection.id, collection.name); else throw error; }
    for (const attribute of collection.attributes) await ensureAttribute(collection.id, attribute);
    await sleep(2500);
    for (const index of collection.indexes) {
      try { await databases.createIndex(databaseId, collection.id, index.key, index.type as any, index.fields); }
      catch (error: any) { if (error.code !== 409) throw error; }
    }
    console.log(`Ready: ${collection.id}`);
  }
}

run().catch((error) => { console.error(error); process.exit(1); });
