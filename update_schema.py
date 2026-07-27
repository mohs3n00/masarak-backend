import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# 1. Add new Enums
new_enums = """
enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

enum CourseType {
  RECORDED
  LIVE
  HYBRID
}

enum CertificateType {
  COMPLETION
  ATTENDANCE
  PROFESSIONAL
}

enum CourseStatus {
  DRAFT
  UNDER_REVIEW
  PUBLISHED
  ARCHIVED
}

enum CourseVisibility {
  PUBLIC
  PRIVATE
  UNLISTED
}

enum CourseAccessType {
  FREE
  PAID
  SUBSCRIPTION
  INVITATION
}
"""

schema = schema.replace('// ------------------------------------------------------\n// DICTIONARIES', new_enums + '\n// ------------------------------------------------------\n// DICTIONARIES')

# 2. Add StudentAcademicInfo to StudentProfile
schema = re.sub(
    r'(model StudentProfile \{.*?)(^\})', 
    r'\1\n  academicInfo   StudentAcademicInfo?\n\2', 
    schema, 
    flags=re.DOTALL | re.MULTILINE
)

# 3. Change TeacherProfile specializations to relation
schema = re.sub(
    r'specializations String\[\]',
    r'specializations Specialization[]',
    schema
)

# 4. Update Course with new fields
course_additions = """
  categoryId     String?
  subjectId      String?
  difficulty     Difficulty?
  type           CourseType @default(RECORDED)
  status         CourseStatus @default(DRAFT)
  visibility     CourseVisibility @default(PUBLIC)
  accessType     CourseAccessType @default(PAID)

  category       Category? @relation(fields: [categoryId], references: [id])
  subject        Subject?  @relation(fields: [subjectId], references: [id])
  
  tags           Tag[]
  learningPaths  LearningPath[]

  prerequisitesPrereq Prerequisite[] @relation("PrerequisiteCourse")
  prerequisitesTarget Prerequisite[] @relation("TargetCourse")
"""
schema = re.sub(
    r'(model Course \{.*?)(^\})', 
    r'\1' + course_additions + '\n\2', 
    schema, 
    flags=re.DOTALL | re.MULTILINE
)

# 5. Add new models at the end of the file
new_models = """
// ------------------------------------------------------
// ACADEMIC STRUCTURE & FOUNDATION
// ------------------------------------------------------

model EducationalStage {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  levels      Level[]
}

model Level {
  id          String   @id @default(uuid())
  stageId     String
  name        String
  slug        String   @unique
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  stage       EducationalStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  subjects    Subject[]
}

model AcademicYear {
  id          String   @id @default(uuid())
  name        String   @unique // e.g. 2024-2025
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  semesters   Semester[]
}

model Semester {
  id              String   @id @default(uuid())
  academicYearId  String
  name            String
  startDate       DateTime
  endDate         DateTime
  isActive        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  academicYear    AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
}

model Department {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  branches    Branch[]
  subjects    Subject[]
}

model Branch {
  id           String   @id @default(uuid())
  departmentId String
  name         String
  slug         String   @unique
  description  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  subjects     Subject[]
}

// ------------------------------------------------------
// TAXONOMY (Categories, Tags, Skills, Subjects)
// ------------------------------------------------------

model Category {
  id          String     @id @default(uuid())
  parentId    String?
  name        String
  slug        String     @unique
  description String?
  icon        String?
  order       Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children    Category[] @relation("CategoryHierarchy")
  subjects    Subject[]
  courses     Course[]
}

model Tag {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  createdAt   DateTime @default(now())

  courses     Course[]
}

model Skill {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  createdAt   DateTime @default(now())

  subjects    Subject[]
}

model Specialization {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now())

  teachers    TeacherProfile[]
}

model SubjectGroup {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  subjects    Subject[]
}

model Subject {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  categoryId  String?
  groupId     String?
  departmentId String?
  branchId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  category    Category? @relation(fields: [categoryId], references: [id])
  group       SubjectGroup? @relation(fields: [groupId], references: [id])
  department  Department? @relation(fields: [departmentId], references: [id])
  branch      Branch? @relation(fields: [branchId], references: [id])
  
  levels      Level[]
  skills      Skill[]
  courses     Course[]

  // Prerequisite relationships
  prerequisitesPrereq Prerequisite[] @relation("PrerequisiteSubject")
  prerequisitesTarget Prerequisite[] @relation("TargetSubject")

  // For StudentAcademicInfo
  studentAcademicInfos StudentAcademicInfo[]
}

model Prerequisite {
  id          String   @id @default(uuid())
  
  prerequisiteSubjectId String?
  targetSubjectId       String?

  prerequisiteCourseId  String?
  targetCourseId        String?

  isMandatory Boolean  @default(true)

  prerequisiteSubject Subject? @relation("PrerequisiteSubject", fields: [prerequisiteSubjectId], references: [id])
  targetSubject       Subject? @relation("TargetSubject", fields: [targetSubjectId], references: [id])

  prerequisiteCourse  Course? @relation("PrerequisiteCourse", fields: [prerequisiteCourseId], references: [id])
  targetCourse        Course? @relation("TargetCourse", fields: [targetCourseId], references: [id])

  @@unique([prerequisiteSubjectId, targetSubjectId])
  @@unique([prerequisiteCourseId, targetCourseId])
}

model LearningPath {
  id          String   @id @default(uuid())
  title       String
  slug        String   @unique
  description String?
  thumbnailUrl String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  courses     Course[]
}

model AcademicCalendar {
  id          String   @id @default(uuid())
  title       String
  startDate   DateTime
  endDate     DateTime
  type        String   // HOLIDAY, EXAM_PERIOD, EVENT
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AcademicSettings {
  id                  String   @id @default(uuid())
  currentAcademicYearId String?
  currentSemesterId     String?
  allowEnrollment     Boolean  @default(true)
  updatedAt           DateTime @updatedAt
}

model StudentAcademicInfo {
  id          String   @id @default(uuid())
  studentProfileId String @unique
  
  studentProfile StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  enrolledSubjects Subject[]
}
"""

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema + '\n' + new_models)

print("Schema updated successfully")
