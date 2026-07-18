// Admin-only endpoints: platform stats, user management, payment history.
// Every route here is already gated by requireAuth + requireAdmin in routes/admin.js.
const pool = require('../db/pool');

async function getStats(req, res, next) {
  try {
    const [users, premium, attempts, graded, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT COUNT(*)::int AS count FROM users WHERE is_premium = true'),
      pool.query('SELECT COUNT(*)::int AS count FROM simulation_attempts'),
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(AVG((result->>'score')::numeric), 0)::float AS avg_score
         FROM simulation_attempts WHERE result->>'mode' = 'graded'`
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount_pesewas), 0)::bigint AS total_pesewas
         FROM payments WHERE status = 'success'`
      ),
    ]);

    return res.json({
      totalUsers: users.rows[0].count,
      premiumUsers: premium.rows[0].count,
      totalAttempts: attempts.rows[0].count,
      gradedAttempts: graded.rows[0].count,
      averageScore: Math.round(graded.rows[0].avg_score * 10) / 10,
      totalRevenueGHS: Number(revenue.rows[0].total_pesewas) / 100,
    });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const search = (req.query.search || '').trim();
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where = `WHERE LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, is_premium, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT 200`,
      params
    );

    return res.json({
      users: rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        role: r.role,
        isPremium: r.is_premium,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

// Promotes or demotes a user between 'student' and 'admin'. Admins can't demote themselves,
// so there's always at least one admin able to manage the platform.
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ error: "role must be 'student' or 'admin'." });
    }
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: "You can't remove your own admin access." });
    }

    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, email, role, is_premium, created_at',
      [role, id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      user: {
        id: rows[0].id,
        fullName: rows[0].full_name,
        email: rows[0].email,
        role: rows[0].role,
        isPremium: rows[0].is_premium,
        createdAt: rows[0].created_at,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.reference, p.amount_pesewas, p.currency, p.status, p.created_at, u.email, u.full_name
       FROM payments p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );

    return res.json({
      payments: rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        amountGHS: r.amount_pesewas / 100,
        currency: r.currency,
        status: r.status,
        createdAt: r.created_at,
        userEmail: r.email,
        userFullName: r.full_name,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStats, listUsers, updateUserRole, listPayments };
