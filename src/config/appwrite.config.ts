import { registerAs } from '@nestjs/config';

export default registerAs('appwrite', () => ({
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '',
  apiKey: process.env.APPWRITE_API_KEY || '',
  databaseId: process.env.APPWRITE_DATABASE_ID || 'masarak_community',
  bucketId: process.env.APPWRITE_BUCKET_ID || 'community-attachments',
}));
