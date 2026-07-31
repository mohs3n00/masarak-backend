const http = require('http');
const autocannon = require('autocannon');
const fs = require('fs');

async function login(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ identifier: email, password });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`Login failed for ${email}: ${body}`));
          try {
            const parsed = JSON.parse(body);
            if (!parsed.tokens || !parsed.tokens.accessToken) {
              return reject(new Error('No accessToken'));
            }
            resolve(parsed.tokens.accessToken);
          } catch (e) {
            reject(new Error(`Failed to parse login response for ${email}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const runBenchmark = (name, url, token) => new Promise((resolve, reject) => {
  console.log(`\nRunning autocannon benchmark for: ${name} (${url})...`);
  const instance = autocannon(
    {
      url: `http://localhost:4000/api${url}`,
      connections: 10,
      pipelining: 1,
      duration: 5,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    (err, result) => {
      if (err) reject(err);
      else resolve({ name, result });
    }
  );
  
  autocannon.track(instance, { renderProgressBar: false });
});

(async () => {
  try {
    console.log('Authenticating benchmark users...');
    const adminToken = await login('benchmark_admin@masarak.com', 'Password123!');
    const teacherToken = await login('benchmark_teacher@masarak.com', 'Password123!');
    const studentToken = await login('benchmark_student@masarak.com', 'Password123!');

    console.log('Tokens acquired. Running benchmark suite...');

    const tests = [
      { name: 'Admin Dashboard', url: '/admin/stats', token: adminToken },
      { name: 'Teacher Dashboard', url: '/teacher/dashboard', token: teacherToken },
      { name: 'Teacher Inbox', url: '/academic-conversations?limit=20', token: teacherToken },
      { name: 'Student Dashboard', url: '/student/dashboard', token: studentToken },
    ];

    const results = [];
    for (const test of tests) {
      const res = await runBenchmark(test.name, test.url, test.token);
      results.push(res);
    }

    console.log('\n========================================');
    console.log('BENCHMARK RESULTS SUMMARY');
    console.log('========================================\n');

    let report = '# Production Benchmark Verification Report\n\n';
    report += '| Endpoint | Req/sec | Avg Latency | P95 Latency | P99 Latency | Throughput | Error Rate |\n';
    report += '|----------|---------|-------------|-------------|-------------|------------|------------|\n';
    
    results.forEach(({ name, result }) => {
      const totalReq = result.requests.total;
      const errorCount = result.errors + (result.non2xx || 0);
      const errorRate = totalReq > 0 ? ((errorCount / totalReq) * 100).toFixed(2) + '%' : '0%';
      const throughput = (result.throughput.average / 1024).toFixed(2) + ' KB/s';
      
      const line = `| ${name} | ${result.requests.average} req/s | ${result.latency.average} ms | ${result.latency.p95} ms | ${result.latency.p99} ms | ${throughput} | ${errorRate} |`;
      console.log(line);
      report += `${line}\n`;
    });

    fs.writeFileSync('benchmark_report.md', report);
    console.log('\nReport saved to backend/benchmark_report.md');
    
  } catch (error) {
    console.error('Benchmark suite error:', error);
  }
})();
