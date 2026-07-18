require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const simulationRoutes = require('./routes/simulations');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(cookieParser());

// Raw body for Paystack webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`OptoPractice server running on port ${PORT}`);
});