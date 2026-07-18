// PostgreSQL connection pool.
// DATABASE_URL comes from your Supabase project: Settings -> Database -> Connection string (URI).
// Example: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db] WARNING: DATABASE_URL is not set. Requests that touch the database will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires SSL. In local/dev this still works because Supabase
  // terminates SSL on their end; rejectUnauthorized:false avoids local CA issues.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

module.exports = pool;
