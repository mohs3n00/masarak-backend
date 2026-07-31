const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

async function main() {
  const q = (sql) => pool.query(sql);

  const adminQueries = [
    `SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT'`,
    `SELECT COUNT(*) FROM "User" WHERE role = 'TEACHER'`,
    `SELECT COUNT(*) FROM "Course" WHERE status = 'PUBLISHED'`,
    `SELECT COUNT(*) FROM "TeacherProfile" WHERE "verificationStatus" = 'PENDING'`,
    `SELECT COUNT(*) FROM "Order"`,
    `SELECT COUNT(*) FROM "Enrollment"`,
  ];

  // Warm up
  await Promise.all(adminQueries.map(q));

  // Sequential (worst case)
  let start = Date.now();
  for (const sql of adminQueries) await q(sql);
  const sequential = Date.now() - start;

  // Concurrent Promise.all (current approach in NestJS)
  start = Date.now();
  await Promise.all(adminQueries.map(q));
  const concurrent = Date.now() - start;

  // Single query (1 round-trip)
  start = Date.now();
  await q(`SELECT 
    (SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT') as students,
    (SELECT COUNT(*) FROM "User" WHERE role = 'TEACHER') as teachers,
    (SELECT COUNT(*) FROM "Course" WHERE status = 'PUBLISHED') as courses,
    (SELECT COUNT(*) FROM "TeacherProfile" WHERE "verificationStatus" = 'PENDING') as pending,
    (SELECT COUNT(*) FROM "Order") as orders,
    (SELECT COUNT(*) FROM "Enrollment") as enrollments`);
  const single = Date.now() - start;

  console.log('\nAdmin Dashboard Query Strategy Comparison:');
  console.log('  Sequential (6 round-trips):', sequential + 'ms');
  console.log('  Concurrent Promise.all (current approach):', concurrent + 'ms');
  console.log('  Single batch query (1 round-trip, optimal):', single + 'ms');
  console.log('  Savings vs concurrent:', (concurrent - single) + 'ms (' + Math.round((concurrent - single) / concurrent * 100) + '% reduction)');

  // Teacher Dashboard: getTeacherProfile called on every method
  const teacherProfileId = (await q(`SELECT id FROM "TeacherProfile" LIMIT 1`)).rows[0]?.id;
  if (teacherProfileId) {
    // Simulate: 1 profile lookup + 5 parallel queries (current = 6 round-trips minimum)
    start = Date.now();
    await q(`SELECT tp.* FROM "TeacherProfile" tp WHERE tp.id = '${teacherProfileId}'`); // getTeacherProfile
    await Promise.all([
      q(`SELECT COUNT(*) FROM "CourseInstructor" WHERE "teacherId" = '${teacherProfileId}'`),
      q(`SELECT COUNT(*) FROM "CourseInstructor" ci JOIN "Course" c ON c.id = ci."courseId" WHERE ci."teacherId" = '${teacherProfileId}' AND c.status = 'PUBLISHED'`),
      q(`SELECT COUNT(*) FROM "Enrollment" e JOIN "CourseInstructor" ci ON ci."courseId" = e."courseId" WHERE ci."teacherId" = '${teacherProfileId}'`),
      q(`SELECT * FROM "TeacherWallet" WHERE "teacherId" = '${teacherProfileId}'`),
      q(`SELECT * FROM "TeacherAnalytics" WHERE "teacherId" = '${teacherProfileId}'`),
    ]);
    const teacherCurrent = Date.now() - start;

    // Optimal: merge profile lookup into a single subquery
    start = Date.now();
    await q(`SELECT 
      tp.*,
      (SELECT COUNT(*) FROM "CourseInstructor" WHERE "teacherId" = '${teacherProfileId}') as total_courses,
      (SELECT COUNT(*) FROM "CourseInstructor" ci JOIN "Course" c ON c.id = ci."courseId" WHERE ci."teacherId" = '${teacherProfileId}' AND c.status = 'PUBLISHED') as published_courses,
      (SELECT COUNT(*) FROM "Enrollment" e JOIN "CourseInstructor" ci ON ci."courseId" = e."courseId" WHERE ci."teacherId" = '${teacherProfileId}') as total_students,
      (SELECT "availableBalance" FROM "TeacherWallet" WHERE "teacherId" = '${teacherProfileId}') as wallet_balance,
      (SELECT "averageRating" FROM "TeacherAnalytics" WHERE "teacherId" = '${teacherProfileId}') as avg_rating
    FROM "TeacherProfile" tp WHERE tp.id = '${teacherProfileId}'`);
    const teacherOptimal = Date.now() - start;

    console.log('\nTeacher Dashboard Query Strategy Comparison:');
    console.log('  Current (1 serial + 5 parallel = 2 round-trips min):', teacherCurrent + 'ms');
    console.log('  Optimal (1 round-trip, single query):', teacherOptimal + 'ms');
    console.log('  Savings:', (teacherCurrent - teacherOptimal) + 'ms (' + Math.round((teacherCurrent - teacherOptimal) / teacherCurrent * 100) + '% reduction)');
  }

  // Measure: how much does each extra round-trip cost?
  const pingTimes = [];
  for (let i = 0; i < 10; i++) {
    const s = Date.now();
    await q('SELECT 1');
    pingTimes.push(Date.now() - s);
  }
  const avgPing = pingTimes.reduce((a,b) => a+b, 0) / pingTimes.length;
  console.log('\nNetwork Round-Trip Cost per DB Query:');
  console.log('  Average:', avgPing.toFixed(1) + 'ms');
  console.log('  = Each unnecessary serial query adds ~' + avgPing.toFixed(0) + 'ms to response time');
  console.log('  = Admin dashboard (6 parallel queries, each 90ms) = at least ' + Math.round(avgPing) + 'ms (bottleneck is network, not DB)');
  console.log('  ROOT CAUSE: Database is hosted remotely (Supabase EU). Each query = 90ms just for network travel.');

  pool.end();
}

main().catch(console.error);
