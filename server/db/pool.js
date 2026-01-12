import pg from 'pg';
const { Pool } = pg;

let pool = null;

export function createPool() {
  if (pool) return pool;

  try {
    // Support Supabase connection string (DATABASE_URL) or individual parameters
    if (process.env.DATABASE_URL) {
      // Supabase requires SSL for all connections
      const isSupabase = process.env.DATABASE_URL.includes('supabase.co');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Supabase uses self-signed certificates, so we need to rejectUnauthorized: false
        ssl: isSupabase ? { rejectUnauthorized: false } : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
      });
    } else if (process.env.DB_HOST) {
      // Fallback to individual connection parameters
      pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'mvp_ganaderia',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
    } else {
      // No database configuration - return null or throw a helpful error
      console.warn('No database configuration found. Set DATABASE_URL or DB_HOST environment variable.');
      return null;
    }

    return pool;
  } catch (error) {
    console.error('Failed to create database pool:', error.message);
    throw error;
  }
}

export function getPool() {
  if (!pool) {
    const newPool = createPool();
    if (!newPool) {
      throw new Error('Database pool not initialized. Please set DATABASE_URL or DB_HOST environment variable.');
    }
    return newPool;
  }
  return pool;
}

// Test database connection
export async function testConnection() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
}
