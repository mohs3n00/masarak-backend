import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
};

async function main() {
  console.log('Seeding benchmark users...');
  
  const password = await argon2.hash('Password123!', ARGON2_OPTIONS);

  const users = [
    { email: 'benchmark_admin@masarak.com', role: Role.ADMIN, name: 'Bench Admin' },
    { email: 'benchmark_teacher@masarak.com', role: Role.TEACHER, name: 'Bench Teacher' },
    { email: 'benchmark_student@masarak.com', role: Role.STUDENT, name: 'Bench Student' }
  ];

  for (const u of users) {
    let existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      existing = await prisma.user.create({
        data: {
          email: u.email,
          password,
          firstName: 'Bench',
          middleName: 'Mark',
          lastName: 'User',
          familyName: 'Test',
          role: u.role,
          isActive: true,
          phone: `+2010${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        }
      });
      console.log(`Created ${u.role}: ${u.email}`);

      if (u.role === Role.TEACHER) {
        await prisma.teacherProfile.create({
          data: {
            userId: existing.id,
            biography: 'Benchmark biography',
            verificationStatus: 'APPROVED'
          }
        });
      } else if (u.role === Role.STUDENT) {
        await prisma.studentProfile.create({
          data: {
            userId: existing.id,
            grade: 'الصف الثالث الثانوي',
            track: 'علمي علوم',
            academicYear: '2025/2026'
          }
        });
      }
    } else {
      console.log(`${u.role} already exists: ${u.email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
