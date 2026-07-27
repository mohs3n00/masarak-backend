const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.spqatrgfuokdcduuagpk:wH44_%256Q-.s7uH%2B@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function run() {
  await client.connect();
  
  console.log('=== Courses ===');
  const courses = await client.query(`SELECT id, title, grades, "isPublished", status FROM "Course"`);
  console.log(courses.rows);

  console.log('=== Student Profiles ===');
  const studentProfiles = await client.query(`SELECT id, "userId", grade FROM "StudentProfile"`);
  console.log(studentProfiles.rows);

  console.log('=== Enrollments ===');
  const enrollments = await client.query(`SELECT * FROM "Enrollment"`);
  console.log(enrollments.rows);

  console.log('=== Teacher Profiles ===');
  const teacherProfiles = await client.query(`SELECT id, "userId" FROM "TeacherProfile"`);
  console.log(teacherProfiles.rows);

  console.log('=== Users ===');
  const users = await client.query(`SELECT id, name, role, email FROM "User"`);
  console.log(users.rows);

  await client.end();
}

run().catch(console.error);
