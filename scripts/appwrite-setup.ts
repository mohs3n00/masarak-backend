import * as dotenv from 'dotenv';
import { Client, Databases, Storage } from 'node-appwrite';

dotenv.config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'masarak_community';
const storageBucketId = 'community-attachments';

if (!projectId || !apiKey) {
  console.error('Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY in environment variables.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

// Constants for Appwrite Collection Attributes
const STRING = 'string';
const INTEGER = 'integer';
const BOOLEAN = 'boolean';

interface AttributeDef {
  key: string;
  type: string;
  required: boolean;
  size?: number;
  array?: boolean;
}

interface IndexDef {
  key: string;
  type: 'key' | 'fulltext' | 'unique';
  attributes: string[];
}

interface CollectionDef {
  name: string;
  id: string;
  attributes: AttributeDef[];
  indexes: IndexDef[];
}

const collections: CollectionDef[] = [
  {
    name: 'Spaces',
    id: 'spaces',
    attributes: [
      { key: 'type', type: STRING, required: true, size: 50 },
      { key: 'referenceId', type: STRING, required: false, size: 100 },
      { key: 'name', type: STRING, required: true, size: 255 },
      { key: 'description', type: STRING, required: false, size: 1000 },
      { key: 'slug', type: STRING, required: true, size: 100 },
      { key: 'isArchived', type: BOOLEAN, required: true },
      { key: 'metadata', type: STRING, required: false, size: 5000 },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_type', type: 'key', attributes: ['type'] },
      { key: 'idx_referenceId', type: 'key', attributes: ['referenceId'] },
      { key: 'idx_slug', type: 'key', attributes: ['slug'] },
    ],
  },
  {
    name: 'Posts',
    id: 'posts',
    attributes: [
      { key: 'spaceId', type: STRING, required: true, size: 100 },
      { key: 'authorId', type: STRING, required: true, size: 100 },
      { key: 'authorName', type: STRING, required: true, size: 255 },
      { key: 'authorRole', type: STRING, required: true, size: 50 },
      { key: 'authorAvatar', type: STRING, required: false, size: 500 },
      { key: 'content', type: STRING, required: true, size: 5000 },
      { key: 'status', type: STRING, required: true, size: 50 },
      { key: 'isPinned', type: BOOLEAN, required: true },
      { key: 'isQuestion', type: BOOLEAN, required: true },
      { key: 'isAnswered', type: BOOLEAN, required: true },
      { key: 'isAnnouncement', type: BOOLEAN, required: true },
      { key: 'reactionsCount', type: INTEGER, required: true },
      { key: 'commentsCount', type: INTEGER, required: true },
      { key: 'tags', type: STRING, required: false, array: true, size: 50 },
      { key: 'deletedAt', type: STRING, required: false, size: 50 },
      { key: 'editHistory', type: STRING, required: false, size: 3000 },
      { key: 'aiMetadata', type: STRING, required: false, size: 2000 },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
      { key: 'updatedAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_spaceId', type: 'key', attributes: ['spaceId'] },
      { key: 'idx_authorId', type: 'key', attributes: ['authorId'] },
      { key: 'idx_status', type: 'key', attributes: ['status'] },
      { key: 'idx_createdAt', type: 'key', attributes: ['createdAt'] },
      { key: 'idx_content_search', type: 'fulltext', attributes: ['content'] },
    ],
  },
  {
    name: 'Comments',
    id: 'comments',
    attributes: [
      { key: 'postId', type: STRING, required: true, size: 100 },
      { key: 'parentId', type: STRING, required: false, size: 100 },
      { key: 'authorId', type: STRING, required: true, size: 100 },
      { key: 'authorName', type: STRING, required: true, size: 255 },
      { key: 'authorRole', type: STRING, required: true, size: 50 },
      { key: 'authorAvatar', type: STRING, required: false, size: 500 },
      { key: 'content', type: STRING, required: true, size: 3000 },
      { key: 'reactionsCount', type: INTEGER, required: true },
      { key: 'repliesCount', type: INTEGER, required: true },
      { key: 'deletedAt', type: STRING, required: false, size: 50 },
      { key: 'editHistory', type: STRING, required: false, size: 2000 },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
      { key: 'updatedAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_postId', type: 'key', attributes: ['postId'] },
      { key: 'idx_parentId', type: 'key', attributes: ['parentId'] },
      { key: 'idx_authorId', type: 'key', attributes: ['authorId'] },
      { key: 'idx_createdAt', type: 'key', attributes: ['createdAt'] },
    ],
  },
  {
    name: 'Reactions',
    id: 'reactions',
    attributes: [
      { key: 'userId', type: STRING, required: true, size: 100 },
      { key: 'targetId', type: STRING, required: true, size: 100 },
      { key: 'targetType', type: STRING, required: true, size: 50 },
      { key: 'type', type: STRING, required: true, size: 50 },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_user_target', type: 'key', attributes: ['userId', 'targetId', 'targetType'] }, // Appwrite doesn't support unique indexes on multiple fields perfectly sometimes, we will use 'key' or enforce in code
      { key: 'idx_target', type: 'key', attributes: ['targetId', 'targetType'] },
    ],
  },
  {
    name: 'Attachments',
    id: 'attachments',
    attributes: [
      { key: 'postId', type: STRING, required: true, size: 100 },
      { key: 'fileId', type: STRING, required: true, size: 100 },
      { key: 'fileName', type: STRING, required: true, size: 255 },
      { key: 'mimeType', type: STRING, required: true, size: 100 },
      { key: 'sizeBytes', type: INTEGER, required: true },
      { key: 'url', type: STRING, required: true, size: 1000 },
      { key: 'type', type: STRING, required: true, size: 50 },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_postId', type: 'key', attributes: ['postId'] },
    ],
  },
  {
    name: 'Reports',
    id: 'reports',
    attributes: [
      { key: 'reporterId', type: STRING, required: true, size: 100 },
      { key: 'targetId', type: STRING, required: true, size: 100 },
      { key: 'targetType', type: STRING, required: true, size: 50 },
      { key: 'reason', type: STRING, required: true, size: 100 },
      { key: 'description', type: STRING, required: false, size: 1000 },
      { key: 'status', type: STRING, required: true, size: 50 },
      { key: 'reviewedBy', type: STRING, required: false, size: 100 },
      { key: 'resolvedAt', type: STRING, required: false, size: 50 },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_status', type: 'key', attributes: ['status'] },
      { key: 'idx_targetId', type: 'key', attributes: ['targetId'] },
    ],
  },
  {
    name: 'Notifications',
    id: 'notifications',
    attributes: [
      { key: 'userId', type: STRING, required: true, size: 100 },
      { key: 'type', type: STRING, required: true, size: 50 },
      { key: 'actorId', type: STRING, required: true, size: 100 },
      { key: 'actorName', type: STRING, required: true, size: 255 },
      { key: 'targetId', type: STRING, required: true, size: 100 },
      { key: 'targetType', type: STRING, required: true, size: 50 },
      { key: 'message', type: STRING, required: true, size: 1000 },
      { key: 'isRead', type: BOOLEAN, required: true },
      { key: 'createdAt', type: STRING, required: true, size: 50 },
    ],
    indexes: [
      { key: 'idx_user_read', type: 'key', attributes: ['userId', 'isRead'] },
      { key: 'idx_user', type: 'key', attributes: ['userId'] },
    ],
  }
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.message === 'fetch failed' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code >= 500) {
        console.log(`API call failed with ${error.message}. Retrying ${i + 1}/${retries} after ${delay}ms...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  return await fn();
}

async function createAttribute(collectionId: string, attr: AttributeDef) {
  try {
    if (attr.type === STRING) {
      await withRetry(() => databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size || 255, attr.required, undefined, attr.array));
    } else if (attr.type === INTEGER) {
      await withRetry(() => databases.createIntegerAttribute(databaseId, collectionId, attr.key, attr.required, undefined, undefined, undefined, attr.array));
    } else if (attr.type === BOOLEAN) {
      await withRetry(() => databases.createBooleanAttribute(databaseId, collectionId, attr.key, attr.required, undefined, attr.array));
    }
    console.log(`Created attribute ${attr.key} for ${collectionId}`);
    await sleep(300);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`Attribute ${attr.key} already exists in ${collectionId}`);
    } else {
      console.error(`Error creating attribute ${attr.key} in ${collectionId}:`, error.message);
    }
  }
}

async function createIndex(collectionId: string, idx: IndexDef) {
  try {
    await withRetry(() => databases.createIndex(databaseId, collectionId, idx.key, idx.type as any, idx.attributes));
    console.log(`Created index ${idx.key} for ${collectionId}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`Index ${idx.key} already exists in ${collectionId}`);
    } else {
      console.error(`Error creating index ${idx.key} in ${collectionId}:`, error.message);
    }
  }
}

async function run() {
  console.log(`Starting Appwrite Setup for database: ${databaseId}`);

  // Check Database
  try {
    console.log(`Checking for database ${databaseId}...`);
    await withRetry(() => databases.get(databaseId));
    console.log(`Database ${databaseId} already exists.`);
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`Database not found. Creating database ${databaseId}...`);
      await withRetry(() => databases.create(databaseId, 'Masarak Community'));
      console.log(`Database ${databaseId} created.`);
    } else {
      console.error('Error getting/creating database:', error.message);
      throw error;
    }
  }

  // Create Storage Bucket
  try {
    await withRetry(() => storage.getBucket(storageBucketId));
    console.log(`Bucket ${storageBucketId} already exists.`);
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`Creating bucket ${storageBucketId}...`);
      await withRetry(() => storage.createBucket(
        storageBucketId,
        'Community Attachments',
        ['read("any")']
      ));
      console.log(`Bucket ${storageBucketId} created.`);
    } else {
      console.error('Error getting/creating bucket:', error.message);
    }
  }

  // Create Collections and Attributes
  for (const coll of collections) {
    try {
      await withRetry(() => databases.getCollection(databaseId, coll.id));
      console.log(`Collection ${coll.name} (${coll.id}) already exists.`);
    } catch (error: any) {
      if (error.code === 404) {
        console.log(`Creating collection ${coll.name} (${coll.id})...`);
        await withRetry(() => databases.createCollection(databaseId, coll.id, coll.name));
      } else {
        console.error(`Error getting collection ${coll.id}:`, error.message);
        continue;
      }
    }

    console.log(`Checking attributes for ${coll.id}...`);
    for (const attr of coll.attributes) {
      await createAttribute(coll.id, attr);
    }

    console.log(`Waiting before creating indexes for ${coll.id} (Appwrite requires attributes to be ready)...`);
    await sleep(2000); 

    for (const idx of coll.indexes) {
      await createIndex(coll.id, idx);
    }
  }

  console.log('Setup complete!');
}

run().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
