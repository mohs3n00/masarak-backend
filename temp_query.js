const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.course.findMany({
  select: { title: true, price: true, originalPrice: true }
}).then(c => {
  console.log(c);
  prisma.$disconnect();
});
