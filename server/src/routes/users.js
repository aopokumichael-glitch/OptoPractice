const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Placeholder for Phase 2 (user profile view/edit). Kept minimal and auth-gated for now.
router.get('/profile', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
