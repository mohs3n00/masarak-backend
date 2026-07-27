const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNamesAndScores() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const fullName = [user.firstName, user.middleName, user.lastName, user.familyName].filter(Boolean).join(' ');
    if (user.name !== fullName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: fullName }
      });
      console.log('Updated user:', fullName);
    }
  }

  const sessions = await prisma.examSession.findMany({
    where: { status: 'COMPLETED' },
    include: { exam: true }
  });

  for (const session of sessions) {
    if (session.score !== null && session.score <= 10) { 
      let percentage = session.score === 2 ? 100 : session.score === 1 ? 50 : 0;
      await prisma.examSession.update({
        where: { id: session.id },
        data: { score: percentage }
      });
      console.log('Updated score for session:', session.id, 'to', percentage);
    }
  }

  console.log('Done');
}

fixNamesAndScores().catch(console.error).finally(() => prisma.$disconnect());
