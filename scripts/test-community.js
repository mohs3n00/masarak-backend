const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWFkbWluLWlkIiwicGhvbmUiOiIxMjM0NTY3ODkiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24taWQiLCJpYXQiOjE3ODU0NTg0NzcsImV4cCI6MTc4NTQ2MjA3N30.MDoqG2225WauURydidm2QbclYgIUPjrbpRyigwfN_E8';
const BASE_URL = 'http://localhost:4001/api/community';

async function request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(BASE_URL + endpoint, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + res.statusText + ': ' + JSON.stringify(data));
  }
  return data;
}

async function runTests() {
  let spaceId = '';
  let postId = '';
  let commentId = '';

  try {
    console.log('\\n--- 1. Testing Spaces ---');
    const spaceRes = await request('/spaces', 'POST', { name: 'Test Space', type: 'global' });
    spaceId = spaceRes.id;
    console.log('✅ Create Space:', spaceRes);

    const spacesList = await request('/spaces');
    console.log('✅ Get Spaces:', spacesList.length > 0 ? 'Found spaces' : 'No spaces');

    console.log('\\n--- 2. Testing Posts ---');
    const postRes = await request('/posts', 'POST', { spaceId, content: 'This is a test post', tags: ['test'] });
    postId = postRes.id;
    console.log('✅ Create Post:', postRes);

    const getPost = await request('/posts/' + postId);
    console.log('✅ Get Post by ID:', getPost.id);

    const feed = await request('/posts/feed?spaceId=' + spaceId);
    console.log('✅ Get Feed:', feed.data && feed.data.length > 0 ? 'Found posts in feed' : 'Empty feed');

    console.log('\\n--- 3. Testing Comments ---');
    const commentRes = await request('/posts/' + postId + '/comments', 'POST', { content: 'This is a test comment' });
    commentId = commentRes.id;
    console.log('✅ Create Comment:', commentRes);

    const commentsList = await request('/posts/' + postId + '/comments');
    console.log('✅ Get Comments for Post:', commentsList.length > 0 ? 'Found comments' : 'No comments');

    console.log('\\n--- 4. Testing Reactions ---');
    const reactionRes = await request('/reactions/post/' + postId, 'POST', { type: 'like' });
    console.log('✅ Toggle Reaction:', reactionRes);

    console.log('\\n--- 5. Testing Search ---');
    const searchRes = await request('/search?q=test');
    console.log('✅ Search Posts:', searchRes.length > 0 ? 'Found search results' : 'No results');

    console.log('\\n--- 6. Testing Notifications ---');
    const notifRes = await request('/notifications');
    console.log('✅ Get Notifications:', notifRes);

    console.log('\\n--- All tests passed! ---');
  } catch (err) {
    console.error('❌ Test failed:', err.message || err);
  }
}

runTests();
