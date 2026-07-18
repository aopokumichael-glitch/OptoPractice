# OptoPractice

A virtual training platform for optometry students, built by Group Seven (University of Cape Coast) as an entrepreneurship & innovation project. It combines a practice-management-style landing page with interactive clinical instrument simulators.

## Project status

**Phase 6 complete** — Ophthalmoscope simulator.

- ✅ Retinoscopy Simulator (real physics-based reflex model)
- ✅ Backend API (Express) with working auth (register/login/logout), JWT cookies, rate limiting
- ✅ PostgreSQL schema (Supabase) for users, simulation attempts, and payments
- ✅ Frontend wired to backend: login/signup modal, saving simulator attempts
- ✅ Dashboard with profile info + simulation history (Phase 2)
- ✅ Retinoscopy Simulator v2: patient Rx hidden in Practice Mode, meridian recording,
  final sphero-cylindrical prescription submission, and clinical-tolerance grading (Phase 3)
- ✅ Paystack Premium: one-time upgrade payment, verified server-side, unlocks a Premium badge (Phase 4)
- ✅ Admin Dashboard: platform stats, user search + role management, payment history (Phase 5)
- ✅ Ophthalmoscope Simulator: hidden fundus cases, focus mechanic, aperture/red-free light,
  cup-to-disc ratio + diagnosis grading (Phase 6)
- ⬜ Clinical case library (Phase 7)
- ⬜ AI tutor (Phase 8)
- ✅ Deployed: backend on Render, frontend on Vercel, database on Supabase

## How the Retinoscopy Simulator works

1. **Practice Mode** (default) hides the patient's true prescription — you don't get to see the answer.
2. Sweep the streak through different meridians, dial in the trial lens, and neutralize the reflex.
3. Click **Record Meridian** each time you neutralize at a new axis (you need at least 2).
4. Enter your own determined **Sphere / Cylinder / Axis** in the Final Prescription panel and submit.
5. You're graded against clinical tolerances (±0.25D sphere/cylinder, axis tolerance scales with
   cylinder power), see a score out of 100, and the true Rx is revealed.
6. **Setup Mode** still exists for building a specific teaching case with the Rx visible/editable.
7. Logged-in users have every graded attempt saved to their **Dashboard**.

## How the Ophthalmoscope Simulator works

1. A random patient case is generated — one of five fundus findings (Normal, Glaucomatous
   Cupping, Papilledema, Diabetic Retinopathy, Central Retinal Vein Occlusion) — with the
   diagnosis hidden.
2. Turn the lens wheel (diopter dial) until the fundus comes into focus.
3. Choose your light aperture — Large Spot, Small Spot, or Red-Free (which genuinely darkens
   hemorrhages for contrast, the same reason it's used clinically).
4. Estimate the cup-to-disc ratio and pick a diagnosis from the multiple-choice list.
5. Submit for grading — clinical tolerance is ±0.10 on CDR and an exact diagnosis match. You'll
   see your score, the real answer, and a short clinical explanation.
6. Logged-in users have every graded attempt saved to their Dashboard, alongside retinoscopy attempts.

## Becoming an admin

There's no signup flow for admin accounts — that's intentional, so random users can't grant
themselves admin access. To make your own account an admin the first time:

1. Go to your Supabase project → **SQL Editor** → **New query**
2. Run this, using the email you registered with:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
   ```
3. Log out and back in on the site (so a fresh session picks up the new role)
4. You'll now see an **Admin** button in the nav bar

Once you're an admin, you can promote/demote other users directly from the Admin Dashboard's
Users table — you don't need to touch SQL again after this first time. Note: the dashboard
won't let an admin remove their *own* admin access, so there's always at least one admin left
who can manage the platform.

## Setting up Paystack (Premium payments)

1. Sign up at [paystack.com](https://paystack.com) (Paystack supports Ghana/GHS).
2. Go to **Settings → API Keys & Webhooks**. Copy your **Test Secret Key** (starts with `sk_test_`).
3. Paste it into `server/.env` as `PAYSTACK_SECRET_KEY`.
4. Restart your backend (`npm run dev:all`).
5. On the Dashboard, click **Upgrade to Premium**. You'll be redirected to Paystack's checkout.
   Use a [Paystack test card](https://paystack.com/docs/payments/test-payments/) to simulate a
   successful payment — no real money moves while using a test key.
6. Paystack redirects you back to `/payment/callback`, which confirms the payment with the
   backend and unlocks your Premium badge.

**Note on webhooks:** Paystack's webhook (`/api/payments/webhook`) can't reach `localhost` directly,
so local development relies on the verification that happens automatically when Paystack redirects
you back to `/payment/callback` — that's the primary confirmation path and works fully offline from
Paystack's webhook servers. The webhook route is there and ready for a public deployment; add that
URL under Paystack's **Webhooks** settings once deployed, and set the same `PAYSTACK_SECRET_KEY` in
your deployed backend's environment.

**Going live:** switch to your **Live Secret Key** once you're ready to accept real payments —
Paystack requires business verification first.

## Project structure

```
OPTOPRACTICE/
├── src/                        # React frontend (Vite)
│   ├── App.jsx                 # Landing page + simulator mounts
│   ├── RetinoscopySimulator.jsx
│   ├── OphthalmoscopeSimulator.jsx
│   ├── pages/Dashboard.jsx
│   ├── pages/AdminDashboard.jsx
│   ├── pages/PaymentCallback.jsx
│   ├── components/AuthModal.jsx
│   ├── context/AuthContext.jsx
│   └── lib/api.js               # fetch wrapper for the backend
├── server/                      # Express backend
│   └── src/
│       ├── index.js
│       ├── routes/              # auth, users, simulations, payments, admin
│       ├── controllers/
│       ├── middleware/auth.js
│       └── db/pool.js
└── supabase/schema.sql          # database schema
```

## Setup

### 1. Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Settings → Database → Connection pooling** and copy the pooler connection string
   (not the direct connection — the pooler works over IPv4, which most home connections need).

### 2. Backend

```bash
cd server
cp .env.example .env
# edit .env: paste your DATABASE_URL, set a random JWT_SECRET, add PAYSTACK_SECRET_KEY
npm install
npm run dev
```

Server runs on `http://localhost:4000`. Visit `http://localhost:4000/health` — you should see `{"status":"ok"}`.

### 3. Frontend

From the project root:

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api/*` calls to the backend automatically (see `vite.config.js`).

### Run both at once (optional)

```bash
npm run dev:all
```

## Environment variables

**`server/.env`** (see `server/.env.example`):
- `DATABASE_URL` — Supabase Postgres connection string (pooler)
- `JWT_SECRET` — any long random string
- `PAYSTACK_SECRET_KEY` — your Paystack secret key
- `CLIENT_URL` — frontend origin (`http://localhost:5173` in dev, your Vercel URL in production)
- `PORT` — defaults to 4000
- `NODE_ENV` — `development` locally, `production` when deployed

**Frontend** (Vercel env var, not needed locally thanks to the Vite proxy):
- `VITE_API_URL` — your deployed backend URL, e.g. `https://optopractice.onrender.com`

## Deployment

The database is already hosted (Supabase). The backend deploys to **Render**, the frontend to
**Vercel** — both connect straight to this GitHub repo and redeploy automatically on every push.

### 1. Deploy the backend (Render)

1. Go to [render.com](https://render.com), sign in with GitHub, click **New → Web Service**,
   and connect this repo.
2. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. Add environment variables (same values as `server/.env`): `DATABASE_URL`, `JWT_SECRET`,
   `PAYSTACK_SECRET_KEY`, `NODE_ENV=production`, and `CLIENT_URL` (your Vercel URL — see step 3).
4. Deploy, then copy the resulting URL (e.g. `https://optopractice.onrender.com`).

> **Free tier note:** Render's free services sleep after ~15 minutes of no traffic; the next
> request takes 30-60 seconds to wake up. Normal, not a bug.

### 2. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New → Project**, import this repo.
2. Vercel auto-detects Vite. Leave the Root Directory as the repo root.
3. Add environment variable `VITE_API_URL` = your Render URL from step 1, **no trailing slash**.
   (Adding this *after* the first deploy? You must trigger a fresh deploy/redeploy afterward —
   Vite variables are baked in at build time, not read live.)
4. Deploy, then copy your production URL (e.g. `https://your-app.vercel.app` — check
   **Settings → Domains** for the short permanent one, not a per-deploy preview URL).

### 3. Connect them

Back in Render → your backend's **Environment** tab → set `CLIENT_URL` to your real Vercel URL
(exact match, `https://`, no trailing slash). Save — Render redeploys automatically.

### 4. (Optional) Add the Paystack webhook

In Paystack: **Settings → API Keys & Webhooks** → set Webhook URL to
`https://your-render-url.onrender.com/api/payments/webhook`.

### 5. Test the live site

Sign up, log in, save a graded attempt on each simulator, upgrade to Premium with a Paystack
test card, and check the Admin Dashboard. If login silently fails in production but works
locally, the most common cause is `CLIENT_URL` on Render not exactly matching your Vercel URL.

## Tech stack

- Frontend: React 19, Vite
- Backend: Node.js, Express
- Database: PostgreSQL (Supabase)
- Auth: JWT stored in an httpOnly cookie, bcrypt password hashing
- Payments: Paystack
- Hosting: Vercel (frontend), Render (backend), Supabase (database)
