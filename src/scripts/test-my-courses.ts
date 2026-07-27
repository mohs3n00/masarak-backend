import { PrismaClient, EnrollmentStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const studentUserId = '4508147a-a802-4c38-bdd1-eb985ec0c3cd'; // student

  console.log(`Querying my courses service logic for student userId: ${studentUserId}...`);
  
  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: studentUserId, status: EnrollmentStatus.ACTIVE },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            instructors: {
              include: { teacher: { include: { user: { select: { name: true, avatar: true } } } } },
              where: { isOwner: true },
              take: 1,
            },
            _count: { select: { sections: true } },
          },
        },
      },
    }),
    prisma.enrollment.count({ where: { userId: studentUserId, status: EnrollmentStatus.ACTIVE } }),
  ]);

  console.log(`Total count: ${total}, list length: ${enrollments.length}`);
  for (const e of enrollments) {
    console.log(`- Enrollment: ${e.id}`);
    console.log(`  Course: "${e.course.title}" (ID: ${e.course.id}), status: ${e.course.status}, grades: ${JSON.stringify(e.course.grades)}`);
    console.log(`  Teacher owner: ${e.course.instructors[0]?.teacher?.user?.name}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
