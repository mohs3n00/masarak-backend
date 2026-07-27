import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# 1. New Enum for Reminder Type
new_enums = """
enum ReminderType {
  UPCOMING_LESSON
  ASSIGNMENT
  EXAM
  GENERAL
}

enum SessionDevice {
  WEB
  MOBILE
  TABLET
}
"""
schema = schema.replace('// ------------------------------------------------------\n// USERS & ROLES', new_enums + '\n// ------------------------------------------------------\n// USERS & ROLES')


# 2. Add collectionId to LessonBookmark
schema = re.sub(
    r'(model LessonBookmark \{.*?)(^\})', 
    r'\1  collectionId   String?\n  collection     BookmarkCollection? @relation(fields: [collectionId], references: [id], onDelete: SetNull)\n\2', 
    schema, 
    flags=re.DOTALL | re.MULTILINE
)

# 3. New Models
new_models = """
// ------------------------------------------------------
// EPIC 4 - STUDENT LEARNING EXPERIENCE
// ------------------------------------------------------

model StudentGoal {
  id             String    @id @default(uuid())
  userId         String
  targetHours    Int       @default(0)
  targetLessons  Int       @default(0)
  frequency      String    @default("WEEKLY") // DAILY, WEEKLY, MONTHLY
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model StudentStreak {
  id             String    @id @default(uuid())
  userId         String    @unique
  currentStreak  Int       @default(0)
  longestStreak  Int       @default(0)
  lastStudyDate  DateTime?

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model StudentAchievement {
  id             String    @id @default(uuid())
  userId         String
  badgeName      String
  description    String?
  earnedAt       DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model StudentStatistics {
  id                 String    @id @default(uuid())
  userId             String    @unique
  totalSecondsWatched Int       @default(0)
  completedLessons   Int       @default(0)
  completedCourses   Int       @default(0)
  updatedAt          DateTime  @updatedAt

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model LearningSession {
  id             String    @id @default(uuid())
  userId         String
  startTime      DateTime  @default(now())
  endTime        DateTime?
  durationSeconds Int?
  device         SessionDevice @default(WEB)

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model DownloadHistory {
  id                 String    @id @default(uuid())
  userId             String
  lessonAttachmentId String
  downloadedAt       DateTime  @default(now())

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  attachment         LessonAttachment @relation(fields: [lessonAttachmentId], references: [id], onDelete: Cascade)
}

model StudentReminder {
  id             String    @id @default(uuid())
  userId         String
  type           ReminderType
  message        String
  triggerAt      DateTime
  isSent         Boolean   @default(false)
  courseId       String?

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  course         Course?   @relation(fields: [courseId], references: [id], onDelete: SetNull)
}

model BookmarkCollection {
  id             String    @id @default(uuid())
  userId         String
  name           String
  icon           String?   // Emoji or icon name
  createdAt      DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookmarks      LessonBookmark[]
}
"""

# Append missing fields to User
user_additions = """
  goals          StudentGoal[]
  streak         StudentStreak?
  achievements   StudentAchievement[]
  statistics     StudentStatistics?
  learningSessions LearningSession[]
  downloads      DownloadHistory[]
  reminders      StudentReminder[]
  bookmarkCollections BookmarkCollection[]
"""
schema = re.sub(
  r'(recentlyViewed RecentlyViewed\[\])',
  r'\1\n' + user_additions,
  schema
)

# Append to Course (reminders)
schema = re.sub(
  r'(recentlyViewed RecentlyViewed\[\])',
  r'\1\n  reminders      StudentReminder[]',
  schema
)

# Append to LessonAttachment
schema = re.sub(
  r'(model LessonAttachment \{.*?)(^\})', 
  r'\1  downloads     DownloadHistory[]\n\2', 
  schema, 
  flags=re.DOTALL | re.MULTILINE
)

# Write back
with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema + '\n' + new_models)

print("Epic 4 Schema modifications applied successfully!")
