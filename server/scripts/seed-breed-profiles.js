import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedBreeds() {
  const client = await pool.connect();
  
  try {
    console.log('🐄 Seeding scientific breed profiles...\n');
    
    // Read the seed SQL file
    const seedPath = path.join(__dirname, '../db/seed_breed_profiles.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    // Execute seed
    await client.query('BEGIN');
    console.log('📊 Inserting breed data from international references...');
    await client.query(seedSQL);
    await client.query('COMMIT');
    
    console.log('✅ Breed profiles seeded successfully!\n');
    
    // Display summary
    const breedsResult = await client.query(`
      SELECT 
        breed_name,
        breed_category,
        total_lactation_liters,
        fat_percentage,
        protein_percentage,
        total_solids_percentage,
        region
      FROM breed_profiles
      ORDER BY breed_category, total_lactation_liters DESC
    `);
    
    console.log('📋 Available Breeds:\n');
    breedsResult.rows.forEach(breed => {
      console.log(`   🐄 ${breed.breed_name.padEnd(20)} | ${breed.breed_category.padEnd(12)} | ${breed.total_lactation_liters}L | Fat: ${breed.fat_percentage}% | Protein: ${breed.protein_percentage}%`);
      console.log(`      Region: ${breed.region}`);
    });
    
    console.log(`\n✅ Total breeds: ${breedsResult.rows.length}`);
    console.log('\n🎯 Ready to use! Scientific Lactation Module is operational.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedBreeds().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
