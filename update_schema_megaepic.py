import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# 1. New Enums
new_enums = """
enum EnrollmentStatus {
  ACTIVE
  CANCELLED
  SUSPENDED
  COMPLETED
}

enum OrderStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum CouponType {
  PERCENTAGE
  FIXED
}

enum AccessGrantedBy {
  PURCHASE
  FREE
  GIFT
  INVITATION
  ADMIN_GRANT
  SUBSCRIPTION
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
"""
schema = schema.replace('// ------------------------------------------------------\n// USERS & ROLES', new_enums + '\n// ------------------------------------------------------\n// USERS & ROLES')

# 2. New Models
new_models = """
// ------------------------------------------------------
// MEGA EPIC - COMMERCE & ENROLLMENT DOMAIN
// ------------------------------------------------------

model Enrollment {
  id             String           @id @default(uuid())
  userId         String
  courseId       String
  status         EnrollmentStatus @default(ACTIVE)
  accessGrantedBy AccessGrantedBy  @default(PURCHASE)
  validUntil     DateTime?
  enrolledAt     DateTime         @default(now())

  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  course         Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}

model Cart {
  id             String    @id @default(uuid())
  userId         String    @unique
  updatedAt      DateTime  @updatedAt

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  items          CartItem[]
}

model CartItem {
  id             String    @id @default(uuid())
  cartId         String
  courseId       String
  addedAt        DateTime  @default(now())

  cart           Cart      @relation(fields: [cartId], references: [id], onDelete: Cascade)
  course         Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([cartId, courseId])
}

model Order {
  id             String      @id @default(uuid())
  userId         String
  status         OrderStatus @default(PENDING)
  totalAmount    Float
  discountAmount Float       @default(0)
  taxAmount      Float       @default(0)
  netAmount      Float
  currency       String      @default("SAR")
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  items          OrderItem[]
  invoice        Invoice?
  couponUsage    CouponUsage?
}

model OrderItem {
  id             String    @id @default(uuid())
  orderId        String
  courseId       String
  price          Float
  discount       Float     @default(0)

  order          Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  course         Course    @relation(fields: [courseId], references: [id])
}

model Invoice {
  id             String    @id @default(uuid())
  orderId        String    @unique
  invoiceNumber  String    @unique
  issuedAt       DateTime  @default(now())
  pdfUrl         String?

  order          Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model Coupon {
  id             String    @id @default(uuid())
  code           String    @unique
  type           CouponType
  value          Float
  maxUses        Int?
  usedCount      Int       @default(0)
  validFrom      DateTime
  validUntil     DateTime?
  isActive       Boolean   @default(true)
  courseId       String?   // If null, applies to all

  course         Course?   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  usages         CouponUsage[]
}

model CouponUsage {
  id             String    @id @default(uuid())
  couponId       String
  userId         String
  orderId        String    @unique
  usedAt         DateTime  @default(now())

  coupon         Coupon    @relation(fields: [couponId], references: [id], onDelete: Cascade)
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  order          Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model CourseInvitation {
  id             String    @id @default(uuid())
  courseId       String
  inviterId      String
  inviteeEmail   String
  isAccepted     Boolean   @default(false)
  createdAt      DateTime  @default(now())

  course         Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  inviter        User      @relation(fields: [inviterId], references: [id], onDelete: Cascade)
}

// ------------------------------------------------------
// MEGA EPIC - TEACHER STUDIO DOMAIN
// ------------------------------------------------------

model TeacherWallet {
  id             String    @id @default(uuid())
  teacherId      String    @unique
  availableBalance Float   @default(0)
  pendingBalance Float     @default(0)
  totalEarned    Float     @default(0)
  currency       String    @default("SAR")
  updatedAt      DateTime  @updatedAt

  teacher        TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  payouts        Payout[]
}

model Payout {
  id             String      @id @default(uuid())
  walletId       String
  amount         Float
  status         PayoutStatus @default(PENDING)
  requestedAt    DateTime    @default(now())
  processedAt    DateTime?
  receiptUrl     String?

  wallet         TeacherWallet @relation(fields: [walletId], references: [id], onDelete: Cascade)
}

model TeacherAnalytics {
  id             String    @id @default(uuid())
  teacherId      String    @unique
  totalStudents  Int       @default(0)
  totalCourses   Int       @default(0)
  totalReviews   Int       @default(0)
  averageRating  Float     @default(0)

  teacher        TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherReport {
  id             String    @id @default(uuid())
  teacherId      String
  month          Int
  year           Int
  revenue        Float
  enrollments    Int
  pdfUrl         String?
  createdAt      DateTime  @default(now())

  teacher        TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

// ------------------------------------------------------
// MEGA EPIC - ADMINISTRATION DOMAIN
// ------------------------------------------------------

model FeatureFlag {
  id             String    @id @default(uuid())
  name           String    @unique
  isEnabled      Boolean   @default(false)
  description    String?
  updatedAt      DateTime  @updatedAt
}

model MaintenanceConfig {
  id             String    @id @default(uuid())
  isActive       Boolean   @default(false)
  message        String    @default("We are undergoing maintenance. We'll be back shortly.")
  updatedAt      DateTime  @updatedAt
}

model AdminAnnouncement {
  id             String    @id @default(uuid())
  title          String
  content        String
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
}

model SupportTicket {
  id             String    @id @default(uuid())
  userId         String
  subject        String
  description    String
  status         TicketStatus @default(OPEN)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

"""

# Append missing fields to Course
course_additions = """
  enrollments    Enrollment[]
  cartItems      CartItem[]
  orderItems     OrderItem[]
  coupons        Coupon[]
  invitations    CourseInvitation[]
"""
schema = re.sub(
  r'(reminders      StudentReminder\[\])',
  r'\1\n' + course_additions,
  schema
)

# Append missing fields to User
user_additions = """
  enrollments    Enrollment[]
  cart           Cart?
  orders         Order[]
  couponUsages   CouponUsage[]
  invitationsSent CourseInvitation[]
  supportTickets SupportTicket[]
"""
schema = re.sub(
  r'(bookmarkCollections BookmarkCollection\[\])',
  r'\1\n' + user_additions,
  schema
)

# Append to TeacherProfile
teacher_additions = """
  wallet         TeacherWallet?
  analytics      TeacherAnalytics?
  reports        TeacherReport[]
"""
schema = re.sub(
  r'(courseInstructors CourseInstructor\[\])',
  r'\1\n' + teacher_additions,
  schema
)

# Write back
with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema + '\n' + new_models)

print("Mega Epic Schema modifications applied successfully!")
