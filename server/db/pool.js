import pg from 'pg';
const { Pool } = pg;

let pool = null;

export function createPool() {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mvp_ganaderia',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  return pool;
}

export function getPool() {
  if (!pool) {
    return createPool();
  }
  return pool;
}
