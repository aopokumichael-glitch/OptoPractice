// Paystack integration lands in Phase 4. These stubs exist now so the routes/frontend
// can be wired up without breaking, and so it's obvious where Phase 4 work plugs in.
function initialize(req, res) {
  return res.status(501).json({ error: 'Payments are not enabled yet (coming in Phase 4: Paystack Premium).' });
}

function webhook(req, res) {
  // NOTE: this route receives express.raw() (see index.js) so Paystack's signature
  // header (x-paystack-signature) can be verified against the raw body in Phase 4.
  return res.status(501).json({ error: 'Payment webhooks are not enabled yet.' });
}

module.exports = { initialize, webhook };
