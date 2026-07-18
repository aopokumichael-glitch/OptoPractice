# OptoPractice

A virtual training platform for optometry students, built by Group Seven (University of Cape Coast) as an entrepreneurship & innovation project. It combines a practice-management-style landing page with interactive clinical instrument simulators, starting with retinoscopy.

## Project status

**Phase 5 complete** — Admin dashboard.

- ✅ Retinoscopy Simulator (real physics-based reflex model)
- ✅ Backend API (Express) with working auth (register/login/logout), JWT cookies, rate limiting
- ✅ PostgreSQL schema (Supabase) for users, simulation attempts, and payments
- ✅ Frontend wired to backend: login/signup modal, saving simulator attempts
- ✅ Dashboard with profile info + simulation history (Phase 2)
- ✅ Retinoscopy Simulator v2: patient Rx hidden in Practice Mode, meridian recording,
  final sphero-cylindrical prescription submission, and clinical-tolerance grading (Phase 3)
- ✅ Paystack Premium: one-time upgrade payment, verified server-side, unlocks a Premium badge (Phase 4)
- ✅ Admin Dashboard: platform stats, user search + role management, payment history (Phase 5)
- ⬜ Ophthalmoscope simulator (Phase 6)
- ⬜ Clinical case library (Phase 7)
- ⬜ AI tutor (Phase 8)

### Becoming an admin (Phase 5)

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

### How the simulator works now

1. Sign up at [paystack.com](https://paystack.com) (Paystack supports Ghana/GHS).
2. Go to **Settings → API Keys & Webhooks**. Copy your **Test Secret Key** (starts with `sk_test_`).
3. Paste it into `server/.env` as `PAYSTACK_SECRET_KEY`.
4. Restart your backend (`npm run dev:all`).
5. On the Dashboard, click **Upgrade to Premium**. You'll be redirected to Paystack's checkout.
   Use a [Paystack test card](https://paystack.com/docs/payments/test-payments/) to simulate a
   successful payment — no real money moves while using a test key.
6. Paystack redirects you back to `http://localhost:5173/payment/callback`, which confirms the
   payment with the backend and unlocks your Premium badge.

**Note on webhooks:** Paystack's webhook (`/api/payments/webhook`) can't reach `localhost` directly,
so local development relies on the verification that happens automatically when Paystack redirects
you back to `/payment/callback` — that's the primary confirmation path and works fully offline from
Paystack's webhook servers. The webhook route is there and ready for when you deploy to a public
URL; add that URL under Paystack's **Webhooks** settings once you do, and set the same
`PAYSTACK_SECRET_KEY` in your deployed backend's environment.

**Going live:** switch to your **Live Secret Key** once you're ready to accept real payments —
Paystack requires business verification first.

### How the simulator works now

1. **Practice Mode** (default) hides the patient's true prescription — you don't get to see the answer.
2. Sweep the streak through different meridians, dial in the trial lens, and neutralize the reflex.
3. Click **Record Meridian** each time you neutralize at a new axis (you need at least 2).
4. Enter your own determined **Sphere / Cylinder / Axis** in the Final Prescription panel and submit.
5. You're graded against clinical tolerances (±0.25D sphere/cylinder, axis tolerance scales with
   cylinder power), see a score out of 100, and the true Rx is revealed.
6. **Setup Mode** still exists for building a specific teaching case with the Rx visible/editable.
7. Logged-in users have every graded attempt saved to their **Dashboard**.

If you already ran `supabase/schema.sql` before, just re-run the updated version — it only adds
one new index and is safe to run again (`create table/index if not exists`).


## Project structure

```
OPTOPRACTICE/
├── src/                    # React frontend (Vite)
│   ├── App.jsx             # Landing page
│   ├── RetinoscopySimulator.jsx
│   ├── components/AuthModal.jsx
│   ├── context/AuthContext.jsx
│   └── lib/api.js          # fetch wrapper for the backend
├── server/                 # Express backend
│   └── src/
│       ├── index.js
│       ├── routes/         # auth, users, simulations, payments, admin
│       ├── controllers/
│       ├── middleware/auth.js
│       └── db/pool.js
└── supabase/schema.sql     # database schema
```

## Setup

### 1. Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Settings → Database → Connection string (URI)** and copy it — you'll need it below.

### 2. Backend

```bash
cd server
cp .env.example .env
# edit .env: paste your DATABASE_URL, set a random JWT_SECRET
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
- `DATABASE_URL` — Supabase Postgres connection string
- `JWT_SECRET` — any long random string
- `CLIENT_URL` — frontend origin, `http://localhost:5173` in dev
- `PORT` — defaults to 4000

## Deployment

The database is already hosted (Supabase). This deploys the backend to **Render** and the
frontend to **Vercel** — both have free tiers and connect straight to your GitHub repo.

### 1. Deploy the backend (Render)

1. Go to [render.com](https://render.com), sign up (GitHub sign-in is easiest), click
   **New → Web Service**, and connect your `OptoPractice` GitHub repo.
2. Configure it:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. Add environment variables (Render's "Environment" tab) — same values as your local `server/.env`:
   - `DATABASE_URL` — your Supabase pooler connection string
   - `JWT_SECRET` — your random secret
   - `PAYSTACK_SECRET_KEY` — your Paystack secret key
   - `NODE_ENV` = `production`
   - `CLIENT_URL` — leave a placeholder like `https://placeholder.vercel.app` for now, you'll
     fix this in step 3 below once you know your real frontend URL
4. Click **Create Web Service**. Wait for the first deploy to finish, then copy your backend's
   URL (something like `https://optopractice-api.onrender.com`).

> **Free tier note:** Render's free web services "spin down" after ~15 minutes of no traffic,
> and the next request takes ~30-60 seconds to wake back up. This is normal — just a heads up
> so a first load doesn't look broken.

### 2. Deploy the frontend (Vercel)

1. Go to [vercel.com](https://vercel.com), sign up with GitHub, click **Add New → Project**,
   and import the same `OptoPractice` repo.
2. Vercel should auto-detect it as a Vite project. Leave the Root Directory as the repo root.
3. Add an environment variable:
   - `VITE_API_URL` = your Render backend URL from step 1 (e.g. `https://optopractice-api.onrender.com`), **no trailing slash**
4. Click **Deploy**. Once it finishes, copy your frontend's URL (e.g. `https://optopractice.vercel.app`).

### 3. Connect them

1. Back in Render, go to your backend's **Environment** tab and update `CLIENT_URL` to your
   real Vercel URL from step 2 (no trailing slash).
2. Save — Render will redeploy automatically.

### 4. (Optional) Add the Paystack webhook now that you have a public URL

1. In Paystack: **Settings → API Keys & Webhooks**
2. Set the **Webhook URL** to `https://your-render-url.onrender.com/api/payments/webhook`

### 5. Test the live site

Visit your Vercel URL and run through the same checks as local dev: sign up, log in, save a
graded retinoscopy attempt, upgrade to Premium with a Paystack test card, and check the Admin
Dashboard if you're an admin. If login seems to silently fail in production but works locally,
double check `CLIENT_URL` on Render matches your Vercel URL **exactly**, including `https://`
and no trailing slash — this is the most common cause.



- Frontend: React 19, Vite
- Backend: Node.js, Express
- Database: PostgreSQL (Supabase)
- Auth: JWT stored in an httpOnly cookie, bcrypt password hashing
