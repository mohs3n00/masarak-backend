import { Client, Databases } from 'node-appwrite';
const client = new Client().setEndpoint('https://fra.cloud.appwrite.io/v1').setProject('6a63af2100251472411b').setKey('standard_f95190e1322832753e5aada38a9d2cafcae1fbd2c94f697cf66c8a6fcdeb7dc264d8714f79b4f96bf8e5d3d255df701cfc3e8a6fc70094f6f7ab58cc092cb292be8dcc717e075852638608859e962f7d80660eeaa87673beef1f92c2f248c389e4bf993123ef0a82c3176ea1e84a2020e692bccf4d65173befd948fe8aefaba7');
const db = new Databases(client);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (error: any) {
      if (error.message === 'fetch failed' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code >= 500) {
        console.log(`API call failed with ${error.message}. Retrying ${i + 1}/${retries}...`);
        await sleep(delay);
      } else { throw error; }
    }
  }
  return await fn();
}
async function run() {
  try { await withRetry(() => db.deleteCollection('masarak_community', 'posts')); console.log('Deleted posts'); } catch (e) { console.log(e); }
  try { await withRetry(() => db.deleteCollection('masarak_community', 'comments')); console.log('Deleted comments'); } catch (e) { console.log(e); }
}
run();
