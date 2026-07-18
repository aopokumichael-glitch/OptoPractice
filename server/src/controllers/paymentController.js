// Paystack integration (Standard/redirect checkout — no client-side Paystack JS needed).
//
// Flow:
//  1. Frontend calls POST /api/payments/initialize -> we ask Paystack for a checkout
//     link and record a "pending" row in `payments`.
//  2. Frontend redirects the browser to that link; the person pays on Paystack's page.
//  3. Paystack redirects back to CLIENT_URL/payment/callback?reference=xxx.
//  4. Frontend calls GET /api/payments/verify/:reference -> we ask Paystack to confirm
//     the payment really succeeded, then mark the user premium. This is the primary
//     path in local development, since Paystack's webhook can't reach localhost.
//  5. In production, the webhook (step 6) is a second, more reliable confirmation path.
//  6. POST /api/payments/webhook — Paystack calls this server-to-server when a payment
//     completes. We verify the signature, then run the same confirm logic as step 4.
const crypto = require('crypto');
const pool = require('../db/pool');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PREMIUM_PRICE_GHS = 50; // adjust to whatever you want to charge
const PREMIUM_PRICE_PESEWAS = PREMIUM_PRICE_GHS * 100;

function paystackHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function initialize(req, res, next) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'Payments are not configured yet (missing PAYSTACK_SECRET_KEY).' });
    }

    const { rows } = await pool.query('SELECT is_premium FROM users WHERE id = $1', [req.user.id]);
    if (rows[0]?.is_premium) {
      return res.status(400).json({ error: 'You already have OptoPractice Premium.' });
    }

    const paystackRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: paystackHeaders(),
      body: JSON.stringify({
        email: req.user.email,
        amount: PREMIUM_PRICE_PESEWAS,
        currency: 'GHS',
        callback_url: `${process.env.CLIENT_URL}/payment/callback`,
        metadata: { userId: req.user.id },
      }),
    });
    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return res.status(502).json({ error: data.message || 'Could not start payment with Paystack.' });
    }

    const { reference, authorization_url } = data.data;

    await pool.query(
      `INSERT INTO payments (user_id, reference, amount_pesewas, currency, status)
       VALUES ($1, $2, $3, 'GHS', 'pending')`,
      [req.user.id, reference, PREMIUM_PRICE_PESEWAS]
    );

    return res.json({ authorizationUrl: authorization_url, reference });
  } catch (err) {
    return next(err);
  }
}

// Shared confirm logic used by both the manual verify endpoint and the webhook.
// Idempotent: safe to call multiple times for the same reference.
async function confirmPayment(reference) {
  const verifyRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: paystackHeaders(),
  });
  const data = await verifyRes.json();

  if (!verifyRes.ok || !data.status) {
    throw new Error(data.message || 'Could not verify transaction with Paystack.');
  }

  const tx = data.data; // { status: 'success' | 'failed' | ..., amount, currency, metadata, ... }
  const paymentRow = await pool.query('SELECT * FROM payments WHERE reference = $1', [reference]);
  const payment = paymentRow.rows[0];

  if (!payment) {
    throw new Error('Unknown payment reference.');
  }

  // Already processed — don't double-credit.
  if (payment.status === 'success') {
    return { alreadyProcessed: true, userId: payment.user_id };
  }

  if (tx.status !== 'success' || tx.amount !== payment.amount_pesewas || tx.currency !== payment.currency) {
    await pool.query('UPDATE payments SET status = $1 WHERE reference = $2', ['failed', reference]);
    return { success: false, userId: payment.user_id };
  }

  await pool.query('UPDATE payments SET status = $1, verified_at = now() WHERE reference = $2', ['success', reference]);
  await pool.query('UPDATE users SET is_premium = true, premium_since = now() WHERE id = $1', [payment.user_id]);

  return { success: true, userId: payment.user_id };
}

async function verify(req, res, next) {
  try {
    const { reference } = req.params;
    const result = await confirmPayment(reference);

    if (result.alreadyProcessed || result.success) {
      return res.json({ premium: true });
    }
    return res.status(402).json({ premium: false, error: 'Payment was not successful.' });
  } catch (err) {
    return next(err);
  }
}

async function webhook(req, res) {
  try {
    const signature = req.headers['x-paystack-signature'];
    const expected = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.body) // raw Buffer — see index.js, this route uses express.raw()
      .digest('hex');

    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature.' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'charge.success') {
      await confirmPayment(event.data.reference);
    }

    return res.sendStatus(200); // acknowledge quickly regardless of internal outcome
  } catch (err) {
    console.error('[webhook] error processing Paystack event:', err);
    return res.sendStatus(200); // still 200 so Paystack doesn't retry-storm us; we log for follow-up
  }
}

module.exports = { initialize, verify, webhook };
