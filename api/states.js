// Vercel serverless function: fetches adsb.lol on the server side, where
// browser CORS rules don't apply, then hands the result to the page.
// No dependencies — Node's built-in fetch (Node 18+) is all that's needed.

export default async function handler(req, res) {
  const { lat, lon, radius } = req.query;

  if (!lat || !lon || !radius) {
    res.status(400).json({ error: 'lat, lon, and radius query params are required' });
    return;
  }

  const upstreamUrl = `https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'skyline-app/1.0' },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `upstream returned HTTP ${upstream.status}` });
      return;
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: `upstream fetch failed: ${err.message}` });
  }
}
