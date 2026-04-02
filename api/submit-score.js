export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, score } = req.body;

  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }

  // Supabase credentials (hidden on server)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    // Check if player exists
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(name)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const existing = await checkRes.json();

    if (existing && existing.length > 0) {
      const user = existing[0];
      const newBest = Math.min(user.best_time, score);
      const newPlays = user.games_played + 1;
      const newTotal = user.total_time + score;

      await fetch(`${SUPABASE_URL}/rest/v1/scores?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          best_time: newBest,
          games_played: newPlays,
          total_time: newTotal,
        }),
      });

      return res.status(200).json({
        success: true,
        isNewRecord: score < user.best_time,
        oldRecord: user.best_time,
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          best_time: score,
          games_played: 1,
          total_time: score,
        }),
      });

      return res.status(200).json({
        success: true,
        isNewRecord: true,
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}