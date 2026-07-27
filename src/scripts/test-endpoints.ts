import { PrismaClient, CourseStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teacherId = 'a38b8118-0401-4419-add7-50220cde9f9d'; // Mohamed Mohsen
  const studentUserId = '4508147a-a802-4c38-bdd1-eb985ec0c3cd'; // student with grade "الصف الثالث الثانوي"

  console.log('--- TEST: Single Teacher for Anonymous (no token/role) ---');
  let user = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER', isActive: true, teacherProfile: { verificationStatus: 'APPROVED' } },
    include: {
      teacherProfile: { 
        include: { 
          subjects: true,
          courseInstructors: {
            where: { isOwner: true, course: { status: CourseStatus.PUBLISHED, isPublished: true } },
            include: {
              course: {
                include: {
                  subject: { select: { name: true } },
                  _count: { select: { enrollments: true } },
                },
              },
            },
          },
        }
      },
    },
  });
  console.log(`Anonymous teacher details - name: ${user?.name}, courses count: ${user?.teacherProfile?.courseInstructors?.length}`);
  for (const ci of user?.teacherProfile?.courseInstructors || []) {
    console.log(`  - ${ci.course.title} (grades: ${JSON.stringify(ci.course.grades)})`);
  }

  console.log('\n--- TEST: Single Teacher for Student with Grade "الصف الثالث الثانوي" ---');
  // Get student grade
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId }
  });
  const studentGrade = profile?.grade;
  console.log(`Student Grade: ${studentGrade}`);

  const courseWhereClause: any = { status: CourseStatus.PUBLISHED, isPublished: true };
  if (studentGrade) {
    courseWhereClause.grades = { has: studentGrade };
  }

  user = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER', isActive: true, teacherProfile: { verificationStatus: 'APPROVED' } },
    include: {
      teacherProfile: { 
        include: { 
          subjects: true,
          courseInstructors: {
            where: { isOwner: true, course: courseWhereClause },
            include: {
              course: {
                include: {
                  subject: { select: { name: true } },
                  _count: { select: { enrollments: true } },
                },
              },
            },
          },
        }
      },
    },
  });
  console.log(`Student-filtered teacher details - name: ${user?.name}, courses count: ${user?.teacherProfile?.courseInstructors?.length}`);
  for (const ci of user?.teacherProfile?.courseInstructors || []) {
    console.log(`  - ${ci.course.title} (grades: ${JSON.stringify(ci.course.grades)})`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
