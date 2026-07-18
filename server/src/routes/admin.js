const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Placeholder for Phase 5 (Admin dashboard).
router.get('/ping', requireAuth, requireAdmin, (req, res) => {
  res.json({ ok: true, message: 'Admin routes wired up. Build out Phase 5 here.' });
});

module.exports = router;
