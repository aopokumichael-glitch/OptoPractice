// Stores simulator attempts so students can see their history and progress over time.
// The payload is intentionally generic (`inputs` / `result` as JSON) because the
// Retinoscopy Simulator v1 is a free-practice tool rather than a graded test —
// Phase 3 (Retinoscopy Simulator v2) will add real scoring and can tighten this shape.
const pool = require('../db/pool');

const ALLOWED_INSTRUMENTS = ['retinoscopy', 'ophthalmoscopy'];

async function saveAttempt(req, res, next) {
  try {
    const { instrument, inputs, result, durationSeconds } = req.body || {};

    if (!ALLOWED_INSTRUMENTS.includes(instrument)) {
      return res.status(400).json({ error: `instrument must be one of: ${ALLOWED_INSTRUMENTS.join(', ')}` });
    }

    const { rows } = await pool.query(
      `INSERT INTO simulation_attempts (user_id, instrument, inputs, result, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, instrument, inputs, result, duration_seconds, created_at`,
      [req.user.id, instrument, inputs || {}, result || {}, durationSeconds || null]
    );

    return res.status(201).json({ attempt: rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function listMyAttempts(req, res, next) {
  try {
    const { instrument } = req.query;
    const params = [req.user.id];
    let query = 'SELECT id, instrument, inputs, result, duration_seconds, created_at FROM simulation_attempts WHERE user_id = $1';

    if (instrument) {
      params.push(instrument);
      query += ` AND instrument = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const { rows } = await pool.query(query, params);
    return res.json({ attempts: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = { saveAttempt, listMyAttempts };
