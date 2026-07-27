import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const studentUserId = '4508147a-a802-4c38-bdd1-eb985ec0c3cd'; // student

  console.log(`Checking enrollments for student userId: ${studentUserId}...`);
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: studentUserId },
    include: {
      course: true
    }
  });

  console.log(`Found ${enrollments.length} enrollments:`);
  for (const e of enrollments) {
    console.log(`- Enrollment ID: ${e.id}, Course: "${e.course.title}" (ID: ${e.course.id}), status: ${e.status}, enrolledAt: ${e.enrolledAt}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
