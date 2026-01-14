/**
 * Migration script: Add sales channels to transformation_data table
 * Run this after the initial schema migration
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createPool } from '../db/pool.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateSalesChannels() {
  let pool = null;
  
  try {
    pool = createPool();
    
    if (!pool) {
      console.error('❌ Migration failed: No database configuration found.');
      console.error('   Please set DATABASE_URL or DB_HOST environment variable.');
      console.error('   Create a .env file in the server/ directory with your database connection string.');
      process.exit(1);
    }
    
    console.log('🔄 Running sales channels migration...');
    
    // Read migration SQL file
    const migrationPath = join(__dirname, '../db/migration_add_sales_channels.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Sales channels migration completed successfully!');
    console.log('   Added columns:');
    console.log('   - sales_channel_direct_percentage');
    console.log('   - sales_channel_distributors_percentage');
    console.log('   - sales_channel_third_percentage');
    console.log('   - direct_sale_price_per_kg');
    console.log('   - distributors_price_per_kg');
    console.log('   - third_channel_price_per_kg');
    console.log('   Added constraint: check_sales_channels_sum');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.error('   Note: Some columns may already exist. This is OK if you\'ve run the migration before.');
    } else if (error.code === '42704') {
      console.error('   Note: Constraint may already exist. This is OK if you\'ve run the migration before.');
    } else {
      console.error('   Full error:', error);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

migrateSalesChannels();
