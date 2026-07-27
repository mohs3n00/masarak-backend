const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.spqatrgfuokdcduuagpk:wH44_%256Q-.s7uH%2B@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function run() {
  await client.connect();
  
  // Fix User names
  const res = await client.query(`
    UPDATE "User"
    SET name = trim(concat_ws(' ', "firstName", NULLIF("middleName", ''), NULLIF("lastName", ''), "familyName"))
    WHERE name != trim(concat_ws(' ', "firstName", NULLIF("middleName", ''), NULLIF("lastName", ''), "familyName"))
  `);
  console.log('Updated users:', res.rowCount);

  // Fix old exam scores
  const scoreRes = await client.query(`
    UPDATE "ExamSession"
    SET score = CASE WHEN score = 2 THEN 100 WHEN score = 1 THEN 50 ELSE 0 END
    WHERE score <= 10 AND status = 'COMPLETED'
  `);
  console.log('Updated exam scores:', scoreRes.rowCount);

  await client.end();
}

run().catch(console.error);
