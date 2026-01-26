import dotenv from 'dotenv';
import { getPool } from '../db/pool.js';

dotenv.config();

async function checkTables() {
  const pool = getPool();
  
  try {
    console.log('🔍 Checking Module 3 tables...\n');

    // Check breed_reference table
    const breedTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'breed_reference'
      );
    `);
    console.log('breed_reference table exists:', breedTableCheck.rows[0].exists);

    if (breedTableCheck.rows[0].exists) {
      const count = await pool.query('SELECT COUNT(*) FROM public.breed_reference');
      console.log('Breed records:', count.rows[0].count);

      if (count.rows[0].count > 0) {
        const sample = await pool.query('SELECT breed_name, ecm_kg_lifetime FROM public.breed_reference ORDER BY ecm_kg_lifetime DESC LIMIT 3');
        console.log('\nTop 3 breeds:');
        sample.rows.forEach((row, idx) => {
          console.log(`  ${idx + 1}. ${row.breed_name}: ${row.ecm_kg_lifetime} kg ECM`);
        });
      }
    }

    // Check breed_scenarios table
    const scenarioTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'breed_scenarios'
      );
    `);
    console.log('\nbreed_scenarios table exists:', scenarioTableCheck.rows[0].exists);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
