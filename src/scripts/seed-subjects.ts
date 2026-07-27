import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  const subjects = ['لغة عربية', 'لغة إنجليزية', 'رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'تاريخ', 'جغرافيا'];
  for (const name of subjects) {
    await prisma.subject.upsert({
      where: { slug: name },
      update: {},
      create: { name, slug: name, description: 'مادة ' + name }
    });
  }
  console.log('Subjects seeded successfully');
}
main().catch(console.error).finally(() => prisma.$disconnect());