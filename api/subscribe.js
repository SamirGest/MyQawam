import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    try {
      const subscription = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription invalide' });
      }

      const key = `sub:${Buffer.from(subscription.endpoint).toString('base64').slice(0, 50)}`;
      await redis.set(key, JSON.stringify(subscription), { ex: 60 * 60 * 24 * 365 });
      await redis.sadd('subscriptions', key);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Subscribe error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const subscription = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription invalide' });
      }

      const key = `sub:${Buffer.from(subscription.endpoint).toString('base64').slice(0, 50)}`;
      await redis.del(key);
      await redis.srem('subscriptions', key);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
