const { fetch, FormData, File } = require('undici');

async function testUpload() {
  const fileContent = Buffer.from('test file content');
  const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
  
  const form = new FormData();
  form.append('file', file);
  form.append('postId', '6a6bf2fd002cd5ceea14'); // Use existing post ID from our earlier tests
  
  // mock user auth
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWFkbWluLWlkIiwicGhvbmUiOiIxMjM0NTY3ODkiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24taWQiLCJpYXQiOjE3ODU0NTg0NzcsImV4cCI6MTc4NTQ2MjA3N30.MDoqG2225WauURydidm2QbclYgIUPjrbpRyigwfN_E8';
  
  try {
    const res = await fetch('http://localhost:4001/api/community/attachments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: form
    });
    const data = await res.json();
    console.log('Upload Result:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testUpload();
