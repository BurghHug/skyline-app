// Vercel serverless function: looks up route (origin/destination/airline)
// for a callsign via adsbdb.com, server-side. adsbdb actually supports
// browser CORS directly, but we proxy anyway to keep everything consistent
// and in one place.

export default async function handler(req, res) {
  const { callsign } = req.query;

  if (!callsign) {
    res.status(400).json({ error: 'callsign query param is required' });
    return;
  }

  const clean = callsign.trim().toUpperCase();
  if (!clean) {
    res.status(200).json({ found: false });
    return;
  }

  const upstreamUrl = `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(clean)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'skyline-app/1.0' },
    });

    if (upstream.status === 404) {
      res.status(200).json({ found: false });
      return;
    }
    if (!upstream.ok) {
      res.status(502).json({ error: `upstream returned HTTP ${upstream.status}` });
      return;
    }

    const data = await upstream.json();
    const route = data && data.response ? data.response.flightroute : null;

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ found: !!route, route });
  } catch (err) {
    res.status(502).json({ error: `upstream fetch failed: ${err.message}` });
  }
}
