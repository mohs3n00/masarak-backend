import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# Fix Category, Tag, Subject, LearningPath back to Course
schema = re.sub(r'courseInstructors CourseInstructor\[\]', r'courses Course[]', schema)

# Fix TeacherProfile (it needs courseInstructors)
schema = re.sub(
    r'(model TeacherProfile \{.*?)(courses Course\[\])(.*?\})', 
    r'\1courseInstructors CourseInstructor[]\3', 
    schema, 
    flags=re.DOTALL
)

# Add missing reverse relations
# 1. Language -> courseLanguages
schema = re.sub(
    r'(model Language \{.*?)(^\})', 
    r'\1  courseLanguages CourseLanguage[]\n\2', 
    schema, 
    flags=re.DOTALL | re.MULTILINE
)

# 2. Lesson -> lessonProgress, notes, bookmarks
schema = re.sub(
    r'(model Lesson \{.*?)(^\})', 
    r'\1  progress      LessonProgress[]\n  notes         StudentNote[]\n  bookmarks     LessonBookmark[]\n\2', 
    schema, 
    flags=re.DOTALL | re.MULTILINE
)

# 3. LessonVideo -> videoProgress, watchHistory
schema = re.sub(
    r'(model LessonVideo \{.*?)(^\})', 
    r'\1  progress      VideoProgress[]\n  watchHistory  WatchHistory[]\n\2', 
    schema, 
    flags=re.DOTALL | re.MULTILINE
)

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema)

print("Fix applied")
