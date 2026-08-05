const sdk = require('node-appwrite');
require('dotenv').config();

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || 'masarak_community';
const bucketId = process.env.APPWRITE_BUCKET_ID;

if (!projectId || !apiKey) {
    console.error('Error: APPWRITE_PROJECT_ID or APPWRITE_API_KEY is not defined in environment variables.');
    process.exit(1);
}

const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

async function cleanCollection(dbId, colId) {
    try {
        console.log(`\n--- Checking collection: [${colId}] ---`);
        let totalDeleted = 0;
        while (true) {
            const response = await databases.listDocuments(dbId, colId, [sdk.Query.limit(100)]);
            if (!response.documents || response.documents.length === 0) {
                break;
            }
            console.log(`Found ${response.documents.length} documents in [${colId}]. Deleting...`);
            for (const doc of response.documents) {
                try {
                    await databases.deleteDocument(dbId, colId, doc.$id);
                    totalDeleted++;
                } catch (err) {
                    console.error(`Failed to delete document ${doc.$id}:`, err.message);
                }
            }
        }
        console.log(`✅ Completed [${colId}]: deleted ${totalDeleted} items.`);
    } catch (e) {
        if (e.code === 404 || e.message?.includes('not found') || e.message?.includes('Collection with the requested ID could not be found')) {
            console.log(`ℹ️ Collection [${colId}] does not exist or is empty (skipping).`);
        } else {
            console.error(`⚠️ Error accessing [${colId}]:`, e.message);
        }
    }
}

async function cleanStorage(bId) {
    if (!bId) return;
    try {
        console.log(`\n--- Checking Storage Bucket: [${bId}] ---`);
        let totalDeleted = 0;
        while (true) {
            const response = await storage.listFiles(bId, [sdk.Query.limit(100)]);
            if (!response.files || response.files.length === 0) break;
            for (const file of response.files) {
                try {
                    await storage.deleteFile(bId, file.$id);
                    totalDeleted++;
                } catch (err) {
                    console.error(`Failed to delete file ${file.$id}:`, err.message);
                }
            }
        }
        console.log(`✅ Completed storage [${bId}]: deleted ${totalDeleted} files.`);
    } catch (e) {
        if (e.code === 404 || e.message?.includes('not found')) {
            console.log(`ℹ️ Storage Bucket [${bId}] does not exist (skipping).`);
        } else {
            console.error(`⚠️ Error accessing bucket [${bId}]:`, e.message);
        }
    }
}

async function resetSpacesPostCount(dbId) {
    try {
        console.log(`\n--- Resetting post/reaction counts on Spaces ---`);
        const response = await databases.listDocuments(dbId, 'spaces', [sdk.Query.limit(100)]);
        let updatedCount = 0;
        for (const space of response.documents) {
            const updatePayload = {};
            if (space.postsCount !== undefined && space.postsCount !== 0) {
                updatePayload.postsCount = 0;
            }
            if (space.commentsCount !== undefined && space.commentsCount !== 0) {
                updatePayload.commentsCount = 0;
            }
            if (Object.keys(updatePayload).length > 0) {
                try {
                    await databases.updateDocument(dbId, 'spaces', space.$id, updatePayload);
                    updatedCount++;
                } catch (err) {
                    // Ignore schema mismatch errors if fields are not directly writable
                }
            }
        }
        console.log(`✅ Reset postsCount to 0 on ${updatedCount} space(s).`);
    } catch (e) {
        console.error(`⚠️ Could not check spaces collection:`, e.message);
    }
}

async function main() {
    console.log(`🚀 Starting Appwrite community messages cleanup on database: [${databaseId}]...`);

    const collectionsToClean = [
        'posts',
        'comments',
        'reactions',
        'attachments',
        'reports',
        'notifications',
        'messages',
        'chat_messages',
        'chat'
    ];

    for (const col of collectionsToClean) {
        await cleanCollection(databaseId, col);
    }

    if (bucketId) {
        await cleanStorage(bucketId);
    }

    await resetSpacesPostCount(databaseId);

    console.log(`\n✨ Done! All community messages and interactions have been wiped cleanly.`);
}

main().catch(err => {
    console.error('Fatal execution error:', err.message);
    process.exit(1);
});
