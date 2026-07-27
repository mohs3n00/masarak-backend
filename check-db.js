const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.spqatrgfuokdcduuagpk:wH44_%256Q-.s7uH%2B@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function run() {
  await client.connect();
  const res = await client.query(`SELECT id, "lessonId", title FROM "ExamTemplate"`);
  console.log('Exams:', res.rows);

  const sessions = await client.query(`SELECT id, "examId", "studentId", score, status FROM "ExamSession"`);
  console.log('Sessions:', sessions.rows);

  const users = await client.query(`SELECT id, name, "firstName", "lastName" FROM "User"`);
  console.log('Users:', users.rows);

  await client.end();
}

run().catch(console.error);
