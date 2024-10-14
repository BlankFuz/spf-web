// pages/api/redis.js (for Next.js)
// or api/redis.js (for Node.js)

import { Redis } from '@upstash/redis';

// Initialize the Redis client with environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// This function will handle incoming requests
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { key, value } = req.body;
    await redis.set(key, value); // Set key-value pair in Redis
    return res.status(200).json({ message: 'Key set successfully' });
  }

  if (req.method === 'GET') {
    const key = req.query.key;
    const value = await redis.get(key); // Get value for the key from Redis
    if (value) {
      return res.status(200).json({ key, value });
    } else {
      return res.status(404).json({ error: 'Key not found' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
