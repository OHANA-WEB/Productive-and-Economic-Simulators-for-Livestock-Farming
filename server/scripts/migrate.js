import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createPool } from '../db/pool.js';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  let pool = null;
  
  try {
    pool = createPool();
    
    if (!pool) {
      console.error('❌ Migration failed: No database configuration found.');
      console.error('   Please set DATABASE_URL or DB_HOST environment variable.');
      console.error('   Create a .env file in the server/ directory with your database connection string.');
      process.exit(1);
    }
    
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully');
    
    // Create a default admin user for testing (password: admin123)
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('admin123', 10);
    
    await pool.query(
      `INSERT INTO users (email, password_hash, name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO NOTHING`,
      ['admin@test.com', passwordHash, 'Admin User']
    );
    
    console.log('✅ Default admin user created (email: admin@test.com, password: admin123)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

migrate();
