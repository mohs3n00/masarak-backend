import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# 1. New Enums
new_enums = """
enum ReactionType {
  LIKE
  LOVE
  CELEBRATE
  INSIGHTFUL
}

enum PostStatus {
  PUBLISHED
  DRAFT
  ARCHIVED
  MODERATED
}

enum MediaProvider {
  LOCAL
  FIREBASE
  CLOUDINARY
  S3
}

enum LogLevel {
  INFO
  WARN
  ERROR
  FATAL
}
"""
schema = schema.replace('// ------------------------------------------------------\n// USERS & ROLES', new_enums + '\n// ------------------------------------------------------\n// USERS & ROLES')

# 2. New Models
new_models = """
// ------------------------------------------------------
// FINAL MEGA EPIC - COMMUNITY PLATFORM
// ------------------------------------------------------

model CommunityPost {
  id             String    @id @default(uuid())
  authorId       String
  content        String
  status         PostStatus @default(PUBLISHED)
  isPinned       Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  author         User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments       CommunityComment[]
  reactions      CommunityReaction[]
  tags           PostTag[]
}

model CommunityComment {
  id             String    @id @default(uuid())
  postId         String
  authorId       String
  content        String
  parentId       String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  post           CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  author         User          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parent         CommunityComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies        CommunityComment[] @relation("CommentReplies")
  reactions      CommunityReaction[]
}

model CommunityReaction {
  id             String    @id @default(uuid())
  userId         String
  postId         String?
  commentId      String?
  type           ReactionType @default(LIKE)
  createdAt      DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  post           CommunityPost?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment        CommunityComment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([userId, postId, commentId])
}

model CommunityTag {
  id             String    @id @default(uuid())
  name           String    @unique
  posts          PostTag[]
}

model PostTag {
  postId         String
  tagId          String

  post           CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag            CommunityTag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
}

// ------------------------------------------------------
// FINAL MEGA EPIC - MEDIA & FILE LIBRARY
// ------------------------------------------------------

model MediaAsset {
  id             String    @id @default(uuid())
  uploaderId     String
  provider       MediaProvider @default(FIREBASE)
  url            String
  fileType       String    // image/png, application/pdf
  sizeBytes      Int       @default(0)
  hash           String?   // For duplicate detection
  createdAt      DateTime  @default(now())

  uploader       User      @relation(fields: [uploaderId], references: [id], onDelete: Cascade)
}

// ------------------------------------------------------
// FINAL MEGA EPIC - LOGGING & REPORTS
// ------------------------------------------------------

model PlatformSetting {
  id             String    @id @default(uuid())
  key            String    @unique
  value          String
  description    String?
  updatedAt      DateTime  @updatedAt
}

model SystemLog {
  id             String    @id @default(uuid())
  level          LogLevel  @default(INFO)
  service        String
  message        String
  meta           Json?
  createdAt      DateTime  @default(now())
}

model ExportReport {
  id             String    @id @default(uuid())
  requesterId    String
  type           String
  status         String    @default("PENDING") // PENDING, COMPLETED, FAILED
  fileUrl        String?
  createdAt      DateTime  @default(now())

  requester      User      @relation(fields: [requesterId], references: [id], onDelete: Cascade)
}
"""

# Append missing fields to User
user_additions = """
  communityPosts    CommunityPost[]
  communityComments CommunityComment[]
  communityReactions CommunityReaction[]
  uploadedMedia     MediaAsset[]
  requestedReports  ExportReport[]
"""
schema = re.sub(
  r'(supportTickets SupportTicket\[\])',
  r'\1\n' + user_additions,
  schema
)


# Write back
with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema + '\n' + new_models)

print("Final Mega Epic Schema modifications applied successfully!")
