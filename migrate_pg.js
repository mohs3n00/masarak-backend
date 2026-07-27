const { Client } = require('pg');

async function migrate() {
  const connectionString = 'postgresql://postgres.spqatrgfuokdcduuagpk:wH44_%256Q-.s7uH%2B@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Get all subjects
    const subjectsRes = await client.query('SELECT id, name FROM "Subject"');
    const subjects = subjectsRes.rows;
    
    // 2. Get all teachers
    const teachersRes = await client.query('SELECT id, "userId", "teachingSubjects" FROM "TeacherProfile"');
    const teachers = teachersRes.rows;

    console.log(`Found ${subjects.length} subjects and ${teachers.length} teachers.`);

    // 3. Prepare mapping
    const normalize = (sub) => sub ? sub.trim().replace(/^ال/, '').replace(/ة$/, 'ه') : '';
    const subjectMap = new Map();
    for (const sub of subjects) {
      subjectMap.set(normalize(sub.name), sub.id);
    }

    let linksAdded = 0;
    for (const teacher of teachers) {
      if (!teacher.teachingSubjects || !Array.isArray(teacher.teachingSubjects)) continue;
      
      for (const rawSub of teacher.teachingSubjects) {
        const norm = normalize(rawSub);
        const matchedId = subjectMap.get(norm);
        
        if (matchedId) {
          // Insert into _SubjectToTeacherProfile
          // A is Subject.id, B is TeacherProfile.id
          try {
            await client.query(
              'INSERT INTO "_SubjectToTeacherProfile" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [matchedId, teacher.id]
            );
            linksAdded++;
          } catch (e) {
            console.error(`Failed to link subject ${rawSub} to teacher ${teacher.id}:`, e.message);
          }
        }
      }
    }
    
    console.log(`Successfully added ${linksAdded} subject-teacher links!`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

migrate();
