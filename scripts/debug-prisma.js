const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.development' });
const prisma = new PrismaClient();

async function main() {
  const lesson = await prisma.lesson.findUnique({
    where: { id: '880e6e45-26d1-427a-8d5b-52f60a1c360d' },
    include: {
      videos: true,
      section: {
        include: {
          course: {
            include: {
              instructors: { include: { teacher: true } }
            }
          }
        }
      }
    }
  });

  if (!lesson) {
    console.log('Lesson NOT found in Prisma DB');
    return;
  }

  console.log('Lesson ID:', lesson.id);
  console.log('Title:', lesson.title);
  console.log('Videos:', lesson.videos.map(v => v.videoUrl));
  const teacherUserId = lesson.section?.course?.instructors?.[0]?.teacher?.userId;
  console.log('Teacher userId:', teacherUserId);

  // Also list all lessons briefly
  const allLessons = await prisma.lesson.findMany({ take: 10, include: { videos: true } });
  console.log('\n=== All Lessons in DB ===');
  allLessons.forEach(l => {
    console.log('  id:', l.id, '| title:', l.title, '| videos:', l.videos.length);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
