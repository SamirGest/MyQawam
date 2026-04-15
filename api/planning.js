import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: sync all planning blocs to Redis
  if (req.method === 'POST') {
    try {
      const { blocs } = req.body;
      if (!Array.isArray(blocs)) {
        return res.status(400).json({ error: 'Format invalide' });
      }
      await redis.set('planning_blocs', JSON.stringify(blocs));
      return res.status(200).json({ success: true, count: blocs.length });
    } catch (error) {
      console.error('Planning sync error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // GET: retrieve planning blocs
  if (req.method === 'GET') {
    try {
      const data = await redis.get('planning_blocs');
      const blocs = data ? (typeof data === 'string' ? JSON.parse(data) : data) : [];
      return res.status(200).json({ blocs });
    } catch (error) {
      console.error('Planning get error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
