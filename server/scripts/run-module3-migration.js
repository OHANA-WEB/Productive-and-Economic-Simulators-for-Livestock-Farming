import dotenv from 'dotenv';
import { getPool } from '../db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = getPool();
  
  try {
    console.log('🔧 Running Module 3 migration...');

    const sqlPath = path.join(__dirname, '../db/migration_breed_reference_module3.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Module 3 migration completed successfully!');
    console.log('   - breed_reference table created');
    console.log('   - breed_scenarios table created');
    console.log('   - Indexes created');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('\n✅ Ready to seed data');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export default runMigration;
