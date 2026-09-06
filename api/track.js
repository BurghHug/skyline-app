// Vercel serverless function: fetches the real recorded flight path for an
// aircraft from OpenSky's /tracks/all endpoint. This is a server-to-server
// request, so OpenSky's browser-only CORS restriction (the thing that broke
// our very first attempt at this app) simply doesn't apply here — CORS only
// governs what a browser will accept, never server-to-server calls.
//
// Anonymous OpenSky access is rate-limited and doesn't have historical track
// data for every aircraft, so this fails gracefully (found:false) whenever
// the data isn't available, letting the frontend fall back to an estimate.

export default async function handler(req, res) {
  const { icao24 } = req.query;

  if (!icao24) {
    res.status(400).json({ error: 'icao24 query param is required' });
    return;
  }

  const url = `https://opensky-network.org/api/tracks/all?icao24=${encodeURIComponent(icao24.toLowerCase())}&time=0`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'skyline-app/1.0' },
    });

    if (!upstream.ok) {
      // Covers 404 (no track available) and rate limiting alike — either way,
      // the frontend should just fall back rather than treat this as fatal.
      res.status(200).json({ found: false });
      return;
    }

    const data = await upstream.json();
    const path = Array.isArray(data.path) ? data.path : [];

    // path entries are [time, lat, lon, baro_altitude, true_track, on_ground]
    const points = path
      .filter(p => typeof p[1] === 'number' && typeof p[2] === 'number')
      .map(p => [p[1], p[2]]);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ found: points.length > 1, points });
  } catch (err) {
    res.status(200).json({ found: false });
  }
}
