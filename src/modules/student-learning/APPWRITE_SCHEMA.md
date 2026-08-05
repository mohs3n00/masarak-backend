# Student Learning Appwrite schema

Create these collections in the same database configured by `APPWRITE_DATABASE_ID`.
The backend service key needs read/write access. Do not grant direct client writes.

## LearningMaterials

Generated lesson-level material. It is shared and versioned by the Phase 1 content schema.

- `lessonId` string (100, required)
- `type` string (30, required): `flashcards`, `quiz`, or `revision`
- `contentVersion` string (100, required)
- `promptVersion` string (100, required)
- `payloadJson` string (50000, required)
- `createdAt` string (50, required)

Index: `lessonId`, `type`, `contentVersion`.

## LearningNotes

- `userId`, `lessonId`, `blockId` string (100; blockId optional)
- `content` string (5000, required)
- `createdAt`, `updatedAt` string (50, required)

Index: `userId`, `lessonId`.

## LearningBookmarks

- `userId`, `lessonId`, `blockId` string (100; blockId optional)
- `title` string (200, optional)
- `createdAt`, `updatedAt` string (50, required)

Index: `userId`, `lessonId`.

## LearningProgress

- `userId`, `lessonId` string (100, required)
- `percent` integer (required)
- `completed` boolean (required)
- `createdAt`, `updatedAt` string (50, required)

Unique index: `userId`, `lessonId`.

## LearningAIUsage

- `userId`, `lessonId` string (100, required)
- `feature`, `promptVersion` string (100, required)
- `createdAt` string (50, required)

Index: `lessonId`, `feature`.

The module only reads Phase 1 `AIOutputs` where `key = content`. It never consumes video URLs, transcripts, or the Phase 1 analysis worker.
