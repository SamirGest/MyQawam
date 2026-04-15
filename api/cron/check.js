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

async function sendToAll(payload) {
  const keys = await redis.smembers('subscriptions');
  let sent = 0;

  for (const key of keys) {
    try {
      const subJson = await redis.get(key);
      if (!subJson) {
        await redis.srem('subscriptions', key);
        continue;
      }
      const subscription = typeof subJson === 'string' ? JSON.parse(subJson) : subJson;
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent++;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await redis.del(key);
        await redis.srem('subscriptions', key);
      }
    }
  }
  return sent;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const now = new Date();
    // Paris timezone (UTC+2 in summer, UTC+1 in winter)
    const parisHour = parseInt(now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }));
    const parisMinute = parseInt(now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', minute: 'numeric' }));

    const results = [];

    // Morning reminder (between 7:00 and 7:14)
    if (parisHour === 7 && parisMinute < 15) {
      const sent = await sendToAll({
        title: 'MyQawam — Bonjour !',
        body: "N'oublie pas tes objectifs du jour ! Prières, sport, habitudes...",
        url: '/',
      });
      results.push({ type: 'morning', sent });
    }

    // Evening recap (between 21:00 and 21:14)
    if (parisHour === 21 && parisMinute < 15) {
      const sent = await sendToAll({
        title: 'MyQawam — Résumé du soir',
        body: "Comment s'est passée ta journée ? Viens valider tes objectifs.",
        url: '/',
      });
      results.push({ type: 'evening', sent });
    }

    // Planning check: find blocs starting in the next 25-40 minutes
    const data = await redis.get('planning_blocs');
    const blocs = data ? (typeof data === 'string' ? JSON.parse(data) : data) : [];

    const parisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const todayStr = `${parisNow.getFullYear()}-${String(parisNow.getMonth() + 1).padStart(2, '0')}-${String(parisNow.getDate()).padStart(2, '0')}`;

    const todayBlocs = blocs.filter((b) => b.date === todayStr);

    for (const bloc of todayBlocs) {
      const [bh, bm] = bloc.heureDebut.split(':').map(Number);
      const blocTime = new Date(parisNow);
      blocTime.setHours(bh, bm, 0, 0);

      const diffMin = (blocTime.getTime() - parisNow.getTime()) / (1000 * 60);

      // Send notification if bloc is 25-40 minutes away (cron runs every 15 min)
      if (diffMin >= 25 && diffMin <= 40) {
        const sent = await sendToAll({
          title: `MyQawam — Dans 30 min`,
          body: `${bloc.titre} (${bloc.heureDebut} - ${bloc.heureFin})`,
          url: '/planning',
        });
        results.push({ type: 'planning', bloc: bloc.titre, sent });
      }
    }

    return res.status(200).json({ ok: true, parisHour, parisMinute, results });
  } catch (error) {
    console.error('Check cron error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
