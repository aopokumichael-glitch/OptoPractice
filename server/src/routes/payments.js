const express = require('express');
const { initialize, webhook } = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/initialize', requireAuth, initialize);
router.post('/webhook', webhook); // no requireAuth: Paystack calls this server-to-server

module.exports = router;
