const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.course.findFirst({ select: { title: true, thumbnail: true } })
  .then(c => console.log(c))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
