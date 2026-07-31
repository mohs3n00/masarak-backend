/**
 * Full Production Performance Investigation Script
 * Covers: Request Lifecycle, EXPLAIN ANALYZE, N+1 Detection, Index Audit, Memory, Sockets
 * 
 * Run: node scripts/investigate.js
 */

const { Pool } = require('pg');
const http = require('http');
const fs = require('fs');

require('dotenv').config();

const DB_URL = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL, max: 5 });

const REPORT = { findings: [], queries: [], indexes: [], n1: [], lifecycle: [] };

// ─── helpers ────────────────────────────────────────────────────────────────
const q = async (sql, label) => {
  const start = Date.now();
  try {
    const res = await pool.query(sql);
    const dur = Date.now() - start;
    return { rows: res.rows, dur, label };
  } catch (e) {
    return { rows: [], dur: 0, label, error: e.message };
  }
};

const explain = async (sql, label) => {
  const start = Date.now();
  try {
    const res = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`);
    const dur = Date.now() - start;
    return { plan: res.rows.map(r => r['QUERY PLAN']).join('\n'), dur, label };
  } catch (e) {
    return { plan: 'ERROR: ' + e.message, dur: 0, label };
  }
};

// ─── 1. Get real user IDs from DB ───────────────────────────────────────────
async function getRealUsers() {
  const admin = await q(`SELECT id, email FROM "User" WHERE role = 'ADMIN' LIMIT 1`, 'admin');
  const teacher = await q(`SELECT u.id, u.email, tp.id as profile_id 
    FROM "User" u JOIN "TeacherProfile" tp ON tp."userId" = u.id 
    WHERE u.role = 'TEACHER' LIMIT 1`, 'teacher');
  const student = await q(`SELECT id, email FROM "User" WHERE role = 'STUDENT' LIMIT 1`, 'student');
  const session = await q(`SELECT id, "userId" FROM "Session" WHERE "userId" = '${admin.rows[0]?.id}' LIMIT 1`, 'session');
  
  return {
    adminId: admin.rows[0]?.id,
    teacherId: teacher.rows[0]?.id,
    teacherProfileId: teacher.rows[0]?.profile_id,
    studentId: student.rows[0]?.id,
    sessionId: session.rows[0]?.id,
  };
}

// ─── 2. JWT Validation Cost ─────────────────────────────────────────────────
async function investigateJwt(users) {
  console.log('\n[1/7] Investigating JWT Validation Cost...');
  
  // JWT strategy does: Session.findUnique(id) include: { user: true }
  // This is 1 DB round-trip PER EVERY AUTHENTICATED REQUEST
  const r1 = await explain(
    `SELECT s.*, u.* FROM "Session" s JOIN "User" u ON u.id = s."userId" WHERE s.id = '${users.sessionId}'`,
    'JWT: Session lookup + user join'
  );
  
  REPORT.lifecycle.push({
    stage: 'JWT Validation (JwtStrategy.validate)',
    cost: `${r1.dur}ms per request`,
    sql: `SELECT * FROM Session JOIN User WHERE Session.id = $sessionId`,
    plan: r1.plan,
    finding: 'CRITICAL: Every authenticated request hits the DB to validate JWT. No caching of session. Under 10 concurrent users = 10 simultaneous Session queries.',
  });
  
  console.log(`  JWT Session lookup: ${r1.dur}ms`);
  console.log('  Plan:', r1.plan.split('\n').slice(0, 3).join('\n'));
}

// ─── 3. Admin Dashboard EXPLAIN ANALYZE ─────────────────────────────────────
async function investigateAdmin() {
  console.log('\n[2/7] Investigating Admin Dashboard...');
  
  const queries = [
    {
      label: 'COUNT students by role',
      sql: `SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT'`
    },
    {
      label: 'COUNT teachers by role',
      sql: `SELECT COUNT(*) FROM "User" WHERE role = 'TEACHER'`
    },
    {
      label: 'COUNT published courses',
      sql: `SELECT COUNT(*) FROM "Course" WHERE status = 'PUBLISHED'`
    },
    {
      label: 'COUNT pending teachers',
      sql: `SELECT COUNT(*) FROM "TeacherProfile" WHERE "verificationStatus" = 'PENDING'`
    },
    {
      label: 'COUNT orders',
      sql: `SELECT COUNT(*) FROM "Order"`
    },
    {
      label: 'COUNT enrollments',
      sql: `SELECT COUNT(*) FROM "Enrollment"`
    },
  ];
  
  for (const qr of queries) {
    const r = await explain(qr.sql, qr.label);
    REPORT.queries.push({
      endpoint: 'GET /admin/stats',
      ...r,
    });
    const seqScan = r.plan.includes('Seq Scan');
    console.log(`  ${qr.label}: ${r.dur}ms ${seqScan ? '⚠️ SEQ SCAN' : '✓'}`);
  }
}

// ─── 4. Teacher Dashboard EXPLAIN ANALYZE ───────────────────────────────────
async function investigateTeacher(users) {
  console.log('\n[3/7] Investigating Teacher Dashboard...');
  
  if (!users.teacherProfileId) {
    console.log('  No teacher profile found, skipping...');
    return;
  }
  
  const pid = users.teacherProfileId;
  
  // getTeacherProfile - called on EVERY method (N+1 risk)
  const r0 = await explain(
    `SELECT tp.*, s.* FROM "TeacherProfile" tp 
     LEFT JOIN "_SubjectToTeacherProfile" stj ON stj."B" = tp.id 
     LEFT JOIN "Subject" s ON s.id = stj."A"
     WHERE tp."userId" = '${users.teacherId}'`,
    'getTeacherProfile (called on EVERY method)'
  );
  
  const r1 = await explain(
    `SELECT COUNT(*) FROM "CourseInstructor" WHERE "teacherId" = '${pid}'`,
    'COUNT total courses'
  );
  
  const r2 = await explain(
    `SELECT COUNT(*) FROM "CourseInstructor" ci 
     JOIN "Course" c ON c.id = ci."courseId" 
     WHERE ci."teacherId" = '${pid}' AND c.status = 'PUBLISHED'`,
    'COUNT published courses (join)'
  );
  
  const r3 = await explain(
    `SELECT COUNT(*) FROM "Enrollment" e
     JOIN "Course" c ON c.id = e."courseId"
     JOIN "CourseInstructor" ci ON ci."courseId" = c.id
     WHERE ci."teacherId" = '${pid}'`,
    'COUNT total students (nested join)'
  );
  
  const r4 = await explain(
    `SELECT * FROM "TeacherWallet" WHERE "teacherId" = '${pid}'`,
    'Wallet lookup'
  );
  
  const r5 = await explain(
    `SELECT * FROM "TeacherAnalytics" WHERE "teacherId" = '${pid}'`,
    'Analytics lookup'
  );
  
  for (const r of [r0, r1, r2, r3, r4, r5]) {
    REPORT.queries.push({ endpoint: 'GET /teacher/dashboard', ...r });
    const seqScan = r.plan.includes('Seq Scan');
    console.log(`  ${r.label}: ${r.dur}ms ${seqScan ? '⚠️ SEQ SCAN' : '✓'}`);
  }
  
  REPORT.n1.push({
    location: 'TeacherDashboardService.getTeacherProfile()',
    description: 'Called at the START of EVERY method (getDashboardStats, getMyCourses, getStudentStatistics, getMyStudents, cancelStudentSubscription, getCourseDetail, updateCourse, addLessonAttachment, updateLesson). This is 1 extra DB query per request.',
    occurrences: 9,
    fix: 'Pass teacherProfileId from JWT payload instead of re-fetching each time.',
  });
}

// ─── 5. Student Dashboard EXPLAIN ANALYZE ───────────────────────────────────
async function investigateStudent(users) {
  console.log('\n[4/7] Investigating Student Dashboard...');
  
  if (!users.studentId) {
    console.log('  No student found, skipping...');
    return;
  }
  
  const sid = users.studentId;
  
  const r1 = await explain(
    `SELECT id, name, avatar FROM "User" WHERE id = '${sid}'`,
    'User lookup'
  );
  
  const r2 = await explain(
    `SELECT e.*, c.id, c.title, c.slug, c."thumbnailUrl", c.grades
     FROM "Enrollment" e 
     JOIN "Course" c ON c.id = e."courseId"
     WHERE e."userId" = '${sid}' AND e.status = 'ACTIVE'
     ORDER BY e."enrolledAt" DESC LIMIT 5`,
    'Enrollments (top 5)'
  );
  
  const r3 = await explain(
    `SELECT * FROM "StudentStatistics" WHERE "userId" = '${sid}'`,
    'Student statistics'
  );
  
  const r4 = await explain(
    `SELECT * FROM "StudentStreak" WHERE "userId" = '${sid}'`,
    'Student streak'
  );
  
  const r5 = await explain(
    `SELECT id, title, message, "isRead", type, "createdAt" 
     FROM "Notification" WHERE "userId" = '${sid}'
     ORDER BY "createdAt" DESC LIMIT 5`,
    'Notifications (top 5)'
  );
  
  // SEQUENTIAL QUERY after Promise.all (extra round-trip)
  const r6 = await explain(
    `SELECT "courseId", "completionPct", "lastAccessedAt"
     FROM "CourseProgress" WHERE "userId" = '${sid}'
     ORDER BY "lastAccessedAt" DESC`,
    'CourseProgress (SEQUENTIAL after parallel queries)'
  );
  
  for (const r of [r1, r2, r3, r4, r5, r6]) {
    REPORT.queries.push({ endpoint: 'GET /student/dashboard', ...r });
    const seqScan = r.plan.includes('Seq Scan');
    console.log(`  ${r.label}: ${r.dur}ms ${seqScan ? '⚠️ SEQ SCAN' : '✓'}`);
  }
  
  REPORT.n1.push({
    location: 'StudentDashboardService.getDashboard() - line 69',
    description: 'CourseProgress query runs SEQUENTIALLY AFTER Promise.all (not inside it). Adds a full extra round-trip to an already 5-query waterfall.',
    occurrences: 1,
    fix: 'Move courseProgress into the Promise.all array.',
  });
}

// ─── 6. Index Audit ──────────────────────────────────────────────────────────
async function investigateIndexes() {
  console.log('\n[5/7] Running Index Audit...');
  
  // Get all indexes from pg_indexes
  const existingIndexes = await q(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `, 'existing indexes');
  
  // Get tables with sequential scans (from pg_stat_user_tables)
  const seqScans = await q(`
    SELECT relname as table, 
           seq_scan, 
           seq_tup_read,
           idx_scan,
           n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE seq_scan > 0
    ORDER BY seq_scan DESC
    LIMIT 20
  `, 'tables with sequential scans');
  
  // Get slow queries from pg_stat_statements if available
  const slowQueries = await q(`
    SELECT query, 
           calls,
           ROUND(total_exec_time::numeric, 2) as total_ms,
           ROUND(mean_exec_time::numeric, 2) as avg_ms,
           ROUND(stddev_exec_time::numeric, 2) as stddev_ms,
           rows
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat%'
    ORDER BY mean_exec_time DESC
    LIMIT 15
  `, 'pg_stat_statements');
  
  REPORT.indexes = existingIndexes.rows.map(i => ({
    table: i.tablename,
    name: i.indexname,
    def: i.indexdef
  }));
  
  console.log(`  Found ${REPORT.indexes.length} indexes`);
  
  // Check for MISSING indexes on critical columns
  const indexedTables = new Set(REPORT.indexes.map(i => `${i.table}::${i.def}`));
  
  const criticalColumns = [
    { table: 'User', column: 'role', reason: 'COUNT by role on every admin dashboard load' },
    { table: 'Enrollment', column: 'userId', reason: 'Student dashboard fetches enrollments by userId' },
    { table: 'Enrollment', column: 'courseId', reason: 'Teacher counts students via courseId' },
    { table: 'Enrollment', column: 'status', reason: 'All enrollment queries filter by status=ACTIVE' },
    { table: 'Notification', column: 'userId', reason: 'Dashboard fetches notifications by userId' },
    { table: 'Notification', column: 'isRead', reason: 'Filtered by isRead on every notification query' },
    { table: 'CourseProgress', column: 'userId', reason: 'Student dashboard fetches progress by userId' },
    { table: 'LessonProgress', column: 'userId', reason: 'Teacher student stats queries by userId' },
    { table: 'VideoProgress', column: 'userId', reason: 'Teacher student stats queries by userId' },
    { table: 'Session', column: 'userId', reason: 'Session cleanup, user logout queries' },
    { table: 'CourseInstructor', column: 'courseId', reason: 'Only teacherId is indexed. courseId queries do Seq Scan.' },
    { table: 'CourseSection', column: 'courseId', reason: 'Fetching sections by course has no index' },
    { table: 'Lesson', column: 'sectionId', reason: 'Fetching lessons by section has no index' },
    { table: 'AcademicConversation', column: 'teacherId+studentId+courseId', reason: 'findFirst without composite index' },
    { table: 'TeacherProfile', column: 'verificationStatus', reason: 'Admin filters by verificationStatus' },
    { table: 'Order', column: 'userId', reason: 'Student orders queries' },
  ];
  
  const missingIndexes = [];
  for (const col of criticalColumns) {
    const hasIndex = REPORT.indexes.some(
      i => i.table.toLowerCase() === col.table.toLowerCase() && 
           i.def.toLowerCase().includes(col.column.toLowerCase().split('+')[0])
    );
    if (!hasIndex) {
      missingIndexes.push({ ...col, severity: 'HIGH' });
      console.log(`  ❌ MISSING INDEX: ${col.table}.${col.column} — ${col.reason}`);
    } else {
      console.log(`  ✓ Index exists: ${col.table}.${col.column}`);
    }
  }
  
  REPORT.findings.push({
    category: 'Database Indexes',
    title: `${missingIndexes.length} Critical Missing Indexes`,
    missing: missingIndexes,
    seqScans: seqScans.rows,
    slowQueries: slowQueries.error ? 'pg_stat_statements not enabled' : slowQueries.rows,
  });
}

// ─── 7. N+1 Pattern Static Analysis ─────────────────────────────────────────
function detectN1Patterns() {
  console.log('\n[6/7] N+1 Pattern Analysis (Code Review)...');
  
  const patterns = [
    {
      severity: 'CRITICAL',
      location: 'AdminDashboardService.getTeachers() — line 81-85',
      code: `// Filter by verification status after join (since it's on teacherProfile)
const filtered = status
  ? data.filter((u) => u.teacherProfile?.verificationStatus === status.toUpperCase())
  : data;`,
      problem: 'Status filter is applied IN JAVASCRIPT after fetching all teachers from DB. If there are 1000 teachers and you filter by status=PENDING (only 5), you fetch 1000 rows unnecessarily.',
      fix: 'Move verificationStatus filter into the Prisma where clause: `where: { teacherProfile: { verificationStatus: status } }`',
      impact: 'Up to 100x excess data transfer for admin teacher list endpoint',
    },
    {
      severity: 'HIGH',
      location: 'AdminDashboardService.deleteUser() — line 251-268',
      code: `for (const courseId of courseIds) {
  const existing = await tx.courseInstructor.findUnique(...)
  if (!existing) {
    await tx.courseInstructor.create(...)
  }
}`,
      problem: 'N+1 inside a transaction: 2 DB queries per courseId (findUnique + create). For a teacher with N courses = 2N queries.',
      fix: 'Use createMany with skipDuplicates:true or use upsert with createMany.',
      impact: 'O(2N) queries per delete. Acceptable currently (few courses per teacher) but will degrade linearly.',
    },
    {
      severity: 'HIGH',
      location: 'TeacherDashboardService — getTeacherProfile() called in 9 methods',
      code: `private async getTeacherProfile(userId: string) {
  const profile = await this.prisma.teacherProfile.findUnique({
    where: { userId },
    include: { subjects: true },   // ← also fetches subjects every time
  });
}`,
      problem: 'Adds 1 DB query to EVERY teacher endpoint. With subjects included, this is a JOIN on every call.',
      fix: 'Include teacherProfileId in JWT payload. Prisma query becomes lookup by primary key (instant).',
      impact: '1 extra DB round-trip on 100% of teacher authenticated requests',
    },
    {
      severity: 'HIGH', 
      location: 'StudentDashboardService.getDashboard() — line 69',
      code: `// After Promise.all resolves...
const progressList = await this.prisma.courseProgress.findMany({
  where: { userId },
  ...
});`,
      problem: 'courseProgress runs SEQUENTIALLY after 5 parallel queries complete. Total = 5 parallel + 1 serial = time(max(5)) + time(progress). Should be inside Promise.all.',
      fix: 'Move courseProgress into the Promise.all array.',
      impact: 'Adds full network round-trip (50-200ms) to every student dashboard load',
    },
    {
      severity: 'MEDIUM',
      location: 'StudentDashboardService.getAvailableCourses() — line 254-262',
      code: `const enrolledIds = new Set(
  (await this.prisma.enrollment.findMany({
    where: { userId, status: EnrollmentStatus.ACTIVE },
    select: { courseId: true },
  })).map((e) => e.courseId),
);`,
      problem: 'Sequential query AFTER fetching all courses. Runs after courses+count Promise.all. Total = parallel(courses+count) + serial(enrollments).',
      fix: 'Move enrollment check into Promise.all, or handle with a single SQL query using LEFT JOIN.',
      impact: 'Extra serial round-trip on every available courses page',
    },
    {
      severity: 'MEDIUM',
      location: 'TeacherDashboardService.getMyStudents() — line 733-740',
      code: `const total = await this.prisma.enrollment.count({
  where: {
    course: { instructors: { some: { teacherId: profile.id } } },
    status: 'ACTIVE',
  },
});`,
      problem: 'Count query runs after findMany (sequential). Both queries have identical complex where clause with nested joins.',
      fix: 'Run both in Promise.all concurrently.',
      impact: '1 extra serial round-trip on teacher students list',
    },
  ];
  
  REPORT.n1 = [...REPORT.n1, ...patterns];
  patterns.forEach(p => {
    console.log(`  [${p.severity}] ${p.location.split('—')[0].trim()}`);
  });
}

// ─── 8. Serialization Cost Analysis ─────────────────────────────────────────
async function investigateSerialization(users) {
  console.log('\n[7/7] Investigating Serialization Cost...');
  
  // Measure JSON.stringify cost for typical dashboard responses
  const mockStudentDash = {
    user: { id: 'abc', name: 'Test', avatar: null, grade: 'الصف الثالث الثانوي' },
    stats: { totalEnrollments: 5, completedCourses: 2, completedLessons: 15, studyHoursTotal: 10, streak: 3, longestStreak: 7 },
    enrolledCourses: Array.from({ length: 5 }, (_, i) => ({
      enrollmentId: `enroll-${i}`, enrolledAt: new Date(),
      course: { id: `c-${i}`, title: `Course ${i}`, slug: `course-${i}`, thumbnailUrl: 'https://example.com/img.jpg', grade: 'الصف الثالث الثانوي', teacherName: 'Teacher Name' },
      progress: { completionPct: 30 + i * 10 }
    })),
    recentNotifications: Array.from({ length: 5 }, (_, i) => ({
      id: `notif-${i}`, title: 'Notification', message: 'Some message here', isRead: false, type: 'SYSTEM', createdAt: new Date()
    }))
  };
  
  const iterations = 1000;
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    JSON.stringify(mockStudentDash);
  }
  const serializationTime = (Date.now() - start) / iterations;
  
  REPORT.findings.push({
    category: 'Serialization',
    title: 'JSON Serialization Cost (Student Dashboard)',
    payloadSize: `${(Buffer.byteLength(JSON.stringify(mockStudentDash)) / 1024).toFixed(2)} KB`,
    costPer1000: `${(serializationTime * 1000).toFixed(2)}ms`,
    finding: `Serialization cost is negligible at ${serializationTime.toFixed(4)}ms per response. The bottleneck is NOT serialization.`,
  });
  
  console.log(`  Dashboard payload: ${(Buffer.byteLength(JSON.stringify(mockStudentDash)) / 1024).toFixed(2)} KB`);
  console.log(`  JSON.stringify cost: ${serializationTime.toFixed(4)}ms per call`);
}

// ─── 9. Memory Investigation ─────────────────────────────────────────────────
function investigateMemory() {
  console.log('\n[BONUS] Memory snapshot...');
  const mem = process.memoryUsage();
  REPORT.findings.push({
    category: 'Memory (Investigation Script Process)',
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
    note: 'This is the investigation script. Backend memory should be measured via process.memoryUsage() inside the running NestJS app.',
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MASARAK Production Performance Investigation');
  console.log('═══════════════════════════════════════════════════════');
  
  const users = await getRealUsers();
  console.log('\nFound users:', {
    adminId: users.adminId ? '✓' : '✗',
    teacherId: users.teacherId ? '✓' : '✗',
    studentId: users.studentId ? '✓' : '✗',
  });
  
  await investigateJwt(users);
  await investigateAdmin();
  await investigateTeacher(users);
  await investigateStudent(users);
  await investigateIndexes();
  detectN1Patterns();
  await investigateSerialization(users);
  investigateMemory();
  
  // Write full report
  fs.writeFileSync('performance_investigation.json', JSON.stringify(REPORT, null, 2));
  console.log('\n✓ Full investigation data saved to performance_investigation.json');
  
  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nQueries analyzed: ${REPORT.queries.length}`);
  console.log(`N+1 patterns found: ${REPORT.n1.length}`);
  console.log(`Missing indexes: ${REPORT.findings.find(f => f.category === 'Database Indexes')?.missing?.length || 0}`);
  
  const slowQueries = REPORT.queries.filter(q => q.dur > 50).sort((a, b) => b.dur - a.dur);
  if (slowQueries.length > 0) {
    console.log(`\nSlowest queries (>50ms):`);
    slowQueries.forEach(q => console.log(`  ${q.dur}ms  ${q.label}`));
  }
  
  await pool.end();
}

main().catch(err => {
  console.error('Investigation failed:', err);
  pool.end();
  process.exit(1);
});
