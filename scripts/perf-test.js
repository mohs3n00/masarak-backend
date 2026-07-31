const http = require('http');

async function benchmarkEndpoint(path, token, iterations = 10) {
  return new Promise((resolve) => {
    let totalTime = 0;
    let payloadSize = 0;
    let completed = 0;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const req = http.request(
        {
          hostname: 'localhost',
          port: 4000,
          path: `/api${path}`,
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            const time = Date.now() - start;
            totalTime += time;
            payloadSize = Buffer.byteLength(data); // Just take the last one
            completed++;
            if (completed === iterations) {
              resolve({
                avgTime: Math.round(totalTime / iterations),
                payloadKb: (payloadSize / 1024).toFixed(2),
                statusCode: res.statusCode
              });
            }
          });
        }
      );
      req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        completed++;
        if (completed === iterations) resolve(null);
      });
      req.end();
    }
  });
}

(async () => {
  const fs = require('fs');
  const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));

  const adminToken = tokens.adminToken;
  const teacherToken = tokens.teacherToken;
  const studentToken = tokens.studentToken;

  console.log("Starting Benchmark...");

  const endpoints = [
    { name: 'Admin Dashboard', path: '/admin/stats', token: adminToken },
    { name: 'Teacher Dashboard', path: '/teacher/dashboard', token: teacherToken },
    { name: 'Teacher Inbox', path: '/academic-conversations?limit=20', token: teacherToken },
    { name: 'Student Dashboard', path: '/student/dashboard', token: studentToken }
  ];

  for (const ep of endpoints) {
    if (ep.token === 'MISSING') {
       console.log(`${ep.name}: Token missing`);
       continue;
    }
    const result = await benchmarkEndpoint(ep.path, ep.token);
    console.log(`${ep.name}: ${result.avgTime}ms | ${result.payloadKb}KB | Status: ${result.statusCode}`);
  }
})();
