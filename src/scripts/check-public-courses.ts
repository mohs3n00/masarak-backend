import { PrismaClient, CourseStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Let's query all courses that match: status: 'PUBLISHED', isPublished: true
  const courses = await prisma.course.findMany({
    where: { status: CourseStatus.PUBLISHED, isPublished: true },
    include: {
      instructors: {
        include: {
          teacher: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${courses.length} published courses:`);
  for (const c of courses) {
    const teacherNames = c.instructors.map(i => i.teacher?.user?.name).join(', ');
    console.log(`- Title: "${c.title}" (ID: ${c.id}), status: ${c.status}, isPublished: ${c.isPublished}, teacher: [${teacherNames}], grades: ${JSON.stringify(c.grades)}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
