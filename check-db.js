const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({ where: { id: 'f3154b4c-04ed-4014-a3dd-be0a7506b714' } });
  console.log(user);
}
check();
