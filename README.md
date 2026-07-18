# OptoPractice

A virtual training platform for optometry students, built by Group Seven (University of Cape Coast) as an entrepreneurship & innovation project. It combines a practice-management-style landing page with interactive clinical instrument simulators, starting with retinoscopy.

## Project status

**Phase 1 in progress** — architecture, auth, and frontend/backend connection.

- ✅ Retinoscopy Simulator (real physics-based reflex model)
- ✅ Backend API (Express) with working auth (register/login/logout), JWT cookies, rate limiting
- ✅ PostgreSQL schema (Supabase) for users + simulation attempts
- ✅ Frontend wired to backend: login/signup modal, saving simulator attempts
- ⬜ Dashboards, profiles (Phase 2)
- ⬜ Retinoscopy Simulator v2 with scoring (Phase 3)
- ⬜ Paystack payments (Phase 4)
- ⬜ Admin dashboard (Phase 5)
- ⬜ Ophthalmoscope simulator (Phase 6)
- ⬜ Clinical case library (Phase 7)
- ⬜ AI tutor (Phase 8)

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

## Tech stack

- Frontend: React 19, Vite
- Backend: Node.js, Express
- Database: PostgreSQL (Supabase)
- Auth: JWT stored in an httpOnly cookie, bcrypt password hashing
