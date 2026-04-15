import { Redis } from '@upstash/redis';
import webpush from 'web-push';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

webpush.setVapidDetails(
  'mailto:samirturkey@outlook.fr',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const title = req.body?.title || 'MyQawam';
    const body = req.body?.body || "N'oublie pas tes objectifs du jour !";
    const url = req.body?.url || '/';

    const payload = JSON.stringify({ title, body, url });

    const keys = await redis.smembers('subscriptions');
    let sent = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const subJson = await redis.get(key);
        if (!subJson) {
          await redis.srem('subscriptions', key);
          continue;
        }
        const subscription = typeof subJson === 'string' ? JSON.parse(subJson) : subJson;
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await redis.del(key);
          await redis.srem('subscriptions', key);
        }
        failed++;
      }
    }

    return res.status(200).json({ sent, failed, total: keys.length });
  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
