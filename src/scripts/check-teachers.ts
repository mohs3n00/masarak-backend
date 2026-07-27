import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- TEACHERS ---');
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    include: {
      teacherProfile: {
        include: {
          courseInstructors: {
            include: {
              course: true
            }
          }
        }
      }
    }
  });

  for (const t of teachers) {
    console.log(`Teacher ID: ${t.id}, Name: ${t.name}`);
    if (t.teacherProfile) {
      console.log(`  Profile ID: ${t.teacherProfile.id}, verificationStatus: ${t.teacherProfile.verificationStatus}`);
      console.log(`  Courses:`);
      for (const ci of t.teacherProfile.courseInstructors) {
        console.log(`    - Course: ${ci.course.title} (ID: ${ci.course.id}), status: ${ci.course.status}, grades: ${JSON.stringify(ci.course.grades)}`);
      }
    } else {
      console.log('  No teacher profile');
    }
  }

  console.log('--- STUDENTS ---');
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      studentProfile: true
    }
  });

  for (const s of students) {
    console.log(`Student ID: ${s.id}, Name: ${s.name}, Grade: ${s.studentProfile?.grade}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
