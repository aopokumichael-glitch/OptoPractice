const express = require('express');
const { saveAttempt, listMyAttempts } = require('../controllers/simulationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/attempts', requireAuth, saveAttempt);
router.get('/attempts', requireAuth, listMyAttempts);

module.exports = router;
