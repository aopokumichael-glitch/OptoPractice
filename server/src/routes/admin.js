const express = require('express');
const { getStats, listUsers, updateUserRole, listPayments } = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Every route below requires a logged-in admin.
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/payments', listPayments);

module.exports = router;
