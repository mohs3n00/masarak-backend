# Appwrite Schema for Lesson Summary Module

Create these collections in the same Appwrite database configured by `APPWRITE_DATABASE_ID`.

## Lessons
- `lessonId` (string, required)
- `teacherId` (string, required)
- `videoUrl` (string, required)
- `status` (string, required)
- `summaryStatus` (string, required)
- `pdfUrl` (string, optional)
- `htmlUrl` (string, optional)
- `jsonUrl` (string, optional)
- `failedStage` (string, optional)
- `version` (string, required)
- `designVersion` (string, required)
- `createdAt` (datetime string, required)
- `updatedAt` (datetime string, required)

## AIJobs
- `jobId` (string, required)
- `lessonId` (string, required)
- `status` (string, required)
- `stage` (string, optional)
- `retries` (integer, required)
- `errorMessage` (string, optional)
- `createdAt` (datetime string, required)
- `updatedAt` (datetime string, required)

## AIOutputs
- `lessonId` (string, required)
- `key` (string, required)
- `fileId` (string, required)
- `path` (string, required)
- `url` (string, required)
- `payloadJson` (string, optional)
- `createdAt` (datetime string, required)
- `updatedAt` (datetime string, required)

## AIMetadata
- `lessonId` (string, required)
- `key` (string, required)
- `payloadJson` (string, required)
- `createdAt` (datetime string, required)
- `updatedAt` (datetime string, required)

## Logs
- `lessonId` (string, required)
- `level` (string, required)
- `message` (string, required)
- `metadata` (string, optional)
- `createdAt` (datetime string, required)

## Storage Bucket
Use `APPWRITE_LESSON_BUCKET_ID` and allow file uploads for:
- `analysis.json`
- `content.json`
- `layout.json`
- `lesson.html`
- `lesson.pdf`
- any lesson assets under `<lessonId>/assets/*`
