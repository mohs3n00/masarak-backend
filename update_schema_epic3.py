import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# 1. Update Course
course_replacements = """
  // Replaced teacherId with M:N CourseInstructor
  instructors    CourseInstructor[]
  sections       CourseSection[]

  bannerUrl      String?
  seoTitle       String?
  metaDescription String?
"""
schema = re.sub(
    r'teacherId\s+String\n.*?teacher\s+TeacherProfile\s+@relation\(fields:\s+\[teacherId\],\s+references:\s+\[id\]\)\n\s+modules\s+Module\[\]',
    course_replacements,
    schema,
    flags=re.DOTALL
)

# Also update TeacherProfile to have courseInstructors instead of courses
schema = re.sub(
    r'courses\s+Course\[\]',
    r'courseInstructors CourseInstructor[]',
    schema
)

# 2. Rename Module to CourseSection
schema = re.sub(r'model Module', r'model CourseSection', schema)
schema = re.sub(
    r'moduleId\s+String\n.*?module\s+Module\s+@relation\(fields:\s+\[moduleId\],\s+references:\s+\[id\],\s+onDelete:\s+Cascade\)',
    r'sectionId    String\n  section      CourseSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)',
    schema,
    flags=re.DOTALL
)

# 3. Enhance Lesson
lesson_replacements = """
  type        ContentType
  order       Int          @default(0)
  isFreePreview Boolean    @default(false)

  section     CourseSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  videos      LessonVideo[]
  attachments LessonAttachment[]
  resources   LessonResource[]
"""
schema = re.sub(
    r'type\s+ContentType\n\s+videoUrl\s+String\?\s+// Used if type is VIDEO\n\s+duration\s+Int\?\s+// In minutes or seconds\n\s+order\s+Int\s+@default\(0\)\n\s+isFreePreview\s+Boolean\s+@default\(false\)\n\n\s+section\s+CourseSection\s+@relation\(fields:\s+\[sectionId\],\s+references:\s+\[id\],\s+onDelete:\s+Cascade\)\n\s+files\s+File\[\]',
    lesson_replacements,
    schema,
    flags=re.DOTALL
)

# 4. Remove File model completely (will be replaced by LessonAttachment)
schema = re.sub(r'model File \{.*?\n\}', '', schema, flags=re.DOTALL)

# 5. Add new Enum
new_enums = """
enum VideoProvider {
  YOUTUBE
  VIMEO
  BUNNY
  CUSTOM
}
"""
schema = schema.replace('// ------------------------------------------------------\n// USERS & ROLES', new_enums + '\n// ------------------------------------------------------\n// USERS & ROLES')

# 6. Add new models
new_models = """

// ------------------------------------------------------
// EPIC 3 - COURSE BUILDER DOMAIN
// ------------------------------------------------------

model CourseInstructor {
  id          String   @id @default(uuid())
  courseId    String
  teacherId   String
  isOwner     Boolean  @default(false)
  share       Float    @default(0) // Revenue share percentage
  createdAt   DateTime @default(now())

  course      Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  teacher     TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)

  @@unique([courseId, teacherId])
}

model CourseObjective {
  id          String   @id @default(uuid())
  courseId    String
  text        String
  order       Int      @default(0)

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model CourseRequirement {
  id          String   @id @default(uuid())
  courseId    String
  text        String
  order       Int      @default(0)

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model CourseFAQ {
  id          String   @id @default(uuid())
  courseId    String
  question    String
  answer      String
  order       Int      @default(0)

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model CourseAnnouncement {
  id          String   @id @default(uuid())
  courseId    String
  title       String
  content     String
  createdAt   DateTime @default(now())

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model CourseGallery {
  id          String   @id @default(uuid())
  courseId    String
  imageUrl    String
  order       Int      @default(0)

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model CourseDiscount {
  id          String   @id @default(uuid())
  courseId    String
  discountPct Float
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model CourseLanguage {
  id          String   @id @default(uuid())
  courseId    String
  languageId  String

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  language    Language @relation(fields: [languageId], references: [id], onDelete: Cascade)

  @@unique([courseId, languageId])
}

// ------------------------------------------------------
// EPIC 3 - LESSON CONTENT DOMAIN
// ------------------------------------------------------

model LessonVideo {
  id          String        @id @default(uuid())
  lessonId    String
  provider    VideoProvider @default(CUSTOM)
  videoUrl    String
  duration    Int           // Seconds
  thumbnailUrl String?
  
  lesson      Lesson        @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model LessonAttachment {
  id          String    @id @default(uuid())
  lessonId    String
  fileName    String
  fileUrl     String
  fileType    String
  sizeBytes   Int
  
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model LessonResource {
  id          String    @id @default(uuid())
  lessonId    String
  title       String
  url         String
  
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

// ------------------------------------------------------
// EPIC 3 - LEARNING ENGINE & TRACKING DOMAIN
// ------------------------------------------------------

model CourseProgress {
  id             String    @id @default(uuid())
  userId         String
  courseId       String
  completionPct  Float     @default(0)
  lastAccessedAt DateTime  @default(now())
  completedAt    DateTime?

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  course         Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}

model LessonProgress {
  id             String    @id @default(uuid())
  userId         String
  lessonId       String
  isCompleted    Boolean   @default(false)
  completedAt    DateTime?

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson         Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
}

model VideoProgress {
  id             String    @id @default(uuid())
  userId         String
  lessonVideoId  String
  watchedSeconds Int       @default(0)
  isCompleted    Boolean   @default(false)
  lastWatchedAt  DateTime  @default(now())

  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  video          LessonVideo @relation(fields: [lessonVideoId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonVideoId])
}

model WatchHistory {
  id             String    @id @default(uuid())
  userId         String
  lessonVideoId  String
  watchedAt      DateTime  @default(now())

  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  video          LessonVideo @relation(fields: [lessonVideoId], references: [id], onDelete: Cascade)
}

model StudentNote {
  id             String    @id @default(uuid())
  userId         String
  lessonId       String
  content        String
  videoTimestamp Int?      // Seconds if attached to a specific video moment

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson         Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model LessonBookmark {
  id             String    @id @default(uuid())
  userId         String
  lessonId       String
  videoTimestamp Int?      // Seconds
  title          String?   // Optional title for bookmark

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson         Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

model CourseCertificate {
  id             String    @id @default(uuid())
  userId         String
  courseId       String
  certificateUrl String
  issuedAt       DateTime  @default(now())
  serialNumber   String    @unique

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  course         Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}

model FavoriteCourse {
  id             String    @id @default(uuid())
  userId         String
  courseId       String
  createdAt      DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  course         Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}

model RecentlyViewed {
  id             String    @id @default(uuid())
  userId         String
  courseId       String
  viewedAt       DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  course         Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}
"""

# Append missing fields to Course
course_additions = """
  objectives     CourseObjective[]
  requirements   CourseRequirement[]
  faqs           CourseFAQ[]
  announcements  CourseAnnouncement[]
  gallery        CourseGallery[]
  discounts      CourseDiscount[]
  languages      CourseLanguage[]
  courseProgress CourseProgress[]
  certificates   CourseCertificate[]
  favorites      FavoriteCourse[]
  recentlyViewed RecentlyViewed[]
"""
schema = re.sub(
  r'(prerequisitesTarget Prerequisite\[\] @relation\("TargetCourse"\))',
  r'\1\n' + course_additions,
  schema
)

# Append to User
user_additions = """
  courseProgress CourseProgress[]
  lessonProgress LessonProgress[]
  videoProgress  VideoProgress[]
  watchHistory   WatchHistory[]
  notes          StudentNote[]
  bookmarks      LessonBookmark[]
  certificates   CourseCertificate[]
  favorites      FavoriteCourse[]
  recentlyViewed RecentlyViewed[]
"""
schema = re.sub(
  r'(auditLogs\s+AuditLog\[\])',
  r'\1\n' + user_additions,
  schema
)

# Write back
with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema + '\n' + new_models)

print("Epic 3 Schema modifications applied successfully!")
