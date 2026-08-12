const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tp = await prisma.teacherProfile.findUnique({ where: { userId: 'f3154b4c-04ed-4014-a3dd-be0a7506b714' } });
  console.log(tp);
}
check();
