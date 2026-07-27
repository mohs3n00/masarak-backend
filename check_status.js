const { Client } = require('pg');

async function checkStatus() {
  const connectionString = 'postgresql://postgres.spqatrgfuokdcduuagpk:wH44_%256Q-.s7uH%2B@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const usersRes = await client.query('SELECT u.id, u."isActive", tp.id as "teacherProfileId" FROM "User" u JOIN "TeacherProfile" tp ON tp."userId" = u.id');
    console.log('Users:', usersRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkStatus();
