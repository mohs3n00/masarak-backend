import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# 1. Delete Old Enrollment Model
schema = re.sub(r'model Enrollment \{.*?\n\}', '', schema, count=1, flags=re.DOTALL)

# 2. Delete Old Coupon Model
schema = re.sub(r'model Coupon \{.*?\n\}', '', schema, count=1, flags=re.DOTALL)

# 3. Delete Duplicate `enrollments Enrollment[]` from User
schema = re.sub(r'\s*enrollments\s+Enrollment\[\]', '', schema)

# 4. Delete Duplicate `coupons Coupon[]` from Course
schema = re.sub(r'\s*coupons\s+Coupon\[\]', '', schema)

# Re-add single relations to Course and User to be perfectly clean
# User
user_adds = """
  enrollments    Enrollment[]
  cart           Cart?
  orders         Order[]
  couponUsages   CouponUsage[]
  invitationsSent CourseInvitation[]
  supportTickets SupportTicket[]
"""
schema = re.sub(r'(bookmarkCollections BookmarkCollection\[\])', r'\1' + user_adds, schema)

# Course
course_adds = """
  enrollments    Enrollment[]
  cartItems      CartItem[]
  orderItems     OrderItem[]
  coupons        Coupon[]
  invitations    CourseInvitation[]
"""
schema = re.sub(r'(reminders      StudentReminder\[\])', r'\1' + course_adds, schema)

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema)

print("Schema duplicates cleaned up!")
