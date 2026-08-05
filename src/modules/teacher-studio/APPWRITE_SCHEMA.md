# Teacher Studio Appwrite schema

Create `TeacherStudioProjects` in `APPWRITE_DATABASE_ID` with backend-only write access.

- `teacherId` string (100, required)
- `type` string (30, required)
- `topic` string (200, required)
- `promptVersion` string (100, required)
- `payloadJson` string (50000, required)
- `createdAt`, `updatedAt` string (50, required)

Create an index over `teacherId, updatedAt`.

The module generates Arabic campaign copy, captions, hashtags, YouTube descriptions, WhatsApp messages, and a `visualBrief`. The brief is deliberately provider-neutral; actual poster/thumbnail image rendering requires a selected image-generation provider and its credentials.
