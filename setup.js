#!/usr/bin/env node

/**
 * MVP Web - Complete Setup Script
 * 
 * This script will:
 * 1. Check database connection
 * 2. Run the complete database migration
 * 3. Seed breed reference data for Module 3
 * 4. Verify the setup
 * 
 * Usage:
 *   node setup.js
 * 
 * Prerequisites:
 *   - PostgreSQL database created
 *   - .env file configured with DATABASE_URL
 *   - npm dependencies installed
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server', '.env') });
dotenv.config({ path: join(__dirname, '.env') });

console.log('\n============================================================================');
console.log('MVP Web - Complete Setup Script');
console.log('============================================================================\n');

// Database connection
let pool;

async function checkDatabaseConnection() {
  console.log('📡 Checking database connection...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found in environment variables');
    console.error('   Please create a .env file with your database connection string');
    console.error('   Example: DATABASE_URL=postgresql://user:password@host:port/database');
    process.exit(1);
  }
  
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Server time: ${result.rows[0].now}\n`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('   Please check your DATABASE_URL in the .env file');
    process.exit(1);
  }
}

async function runMigration() {
  console.log('📦 Running database migration...');
  
  try {
    const migrationSQL = readFileSync(
      join(__dirname, 'server', 'db', 'complete_migration.sql'),
      'utf8'
    );
    
    await pool.query(migrationSQL);
    console.log('✅ Database migration completed successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('   Stack trace:', error.stack);
    }
    return false;
  }
}

async function seedBreedData() {
  console.log('🌱 Seeding breed reference data...');
  
  try {
    // Read the breed data JSON
    const breedDataPath = join(__dirname, 'server', 'metacaprine_module3_breed_reference_ranked_ecm.json');
    const breedDataRaw = readFileSync(breedDataPath, 'utf8');
    const breedData = JSON.parse(breedDataRaw);
    
    if (!Array.isArray(breedData) || breedData.length === 0) {
      console.error('❌ Breed data is empty or invalid');
      return false;
    }
    
    console.log(`   Found ${breedData.length} breeds to import`);
    
    // Clear existing breed data
    await pool.query('TRUNCATE TABLE public.breed_reference CASCADE');
    console.log('   Cleared existing breed data');
    
    let imported = 0;
    let skipped = 0;
    
    for (const breed of breedData) {
      try {
        // Map JSON fields to database fields
        // JSON uses: milk_per_lactation_kg, lactations_per_life_avg, etc.
        // Database expects: milk_kg_yr, lactations_lifetime_avg, etc.
        const breedName = breed.breed || breed.breed_name;
        
        // Generate breed_key (slug)
        const breedKey = breedName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        
        // Parse country/system from validation_source
        let countryOrSystem = breed.validation_source || 'N/A';
        const match = breed.validation_source?.match(/\(([^)]+)\)/);
        if (match) {
          countryOrSystem = match[1];
        }
        
        // Map JSON structure to database structure
        // milk_per_lactation_kg -> milk_kg_yr (assuming one lactation per year)
        const milkKgYr = breed.milk_per_lactation_kg || breed.milk_kg_yr;
        const lactDaysAvg = breed.lactation_days_avg || breed.lact_days_avg;
        const lactationsLifetimeAvg = breed.lactations_per_life_avg || breed.lactations_lifetime_avg;
        const fatPct = breed.fat_pct;
        const proteinPct = breed.protein_pct;
        
        // Calculate derived values
        const fatKgYr = breed.fat_kg_per_lactation || (milkKgYr * (fatPct / 100));
        const proteinKgYr = breed.protein_kg_per_lactation || (milkKgYr * (proteinPct / 100));
        const fatPlusProteinPct = fatPct + proteinPct;
        const fatPlusProteinKgYr = breed.fat_plus_protein_kg_per_lactation || (fatKgYr + proteinKgYr);
        
        // ECM formula: ECM(kg) = Milk(kg) × (0.327 + 0.122×Fat% + 0.077×Protein%)
        const ecmKgYr = breed.ecm_per_lactation_kg || (milkKgYr * (0.327 + 0.122 * fatPct + 0.077 * proteinPct));
        const ecmKgLifetime = breed.lifetime?.ecm_kg || (ecmKgYr * lactationsLifetimeAvg);
        
        // Approximate liters note
        const approxLitersNote = breed.approx_liters_note || `≈ ${Math.round(milkKgYr / 1.03)} L/año`;
        
        await pool.query(`
          INSERT INTO public.breed_reference (
            breed_name, breed_key, country_or_system, source_tags, notes,
            milk_kg_yr, fat_pct, protein_pct, lact_days_avg, lactations_lifetime_avg,
            fat_kg_yr, protein_kg_yr, fat_plus_protein_pct, fat_plus_protein_kg_yr,
            ecm_kg_yr, ecm_kg_lifetime, approx_liters_note, image_asset_key
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17, $18
          )
          ON CONFLICT (breed_name) DO UPDATE SET
            country_or_system = EXCLUDED.country_or_system,
            milk_kg_yr = EXCLUDED.milk_kg_yr,
            fat_pct = EXCLUDED.fat_pct,
            protein_pct = EXCLUDED.protein_pct,
            lact_days_avg = EXCLUDED.lact_days_avg,
            lactations_lifetime_avg = EXCLUDED.lactations_lifetime_avg,
            fat_kg_yr = EXCLUDED.fat_kg_yr,
            protein_kg_yr = EXCLUDED.protein_kg_yr,
            fat_plus_protein_pct = EXCLUDED.fat_plus_protein_pct,
            fat_plus_protein_kg_yr = EXCLUDED.fat_plus_protein_kg_yr,
            ecm_kg_yr = EXCLUDED.ecm_kg_yr,
            ecm_kg_lifetime = EXCLUDED.ecm_kg_lifetime,
            approx_liters_note = EXCLUDED.approx_liters_note,
            updated_at = now()
        `, [
          breedName,
          breedKey,
          countryOrSystem,
          breed.source_tags || [],
          breed.notes || null,
          milkKgYr,
          fatPct,
          proteinPct,
          lactDaysAvg,
          lactationsLifetimeAvg,
          fatKgYr,
          proteinKgYr,
          fatPlusProteinPct,
          fatPlusProteinKgYr,
          ecmKgYr,
          ecmKgLifetime,
          approxLitersNote,
          breed.image_asset_key || null
        ]);
        
        imported++;
      } catch (error) {
        console.error(`   ⚠️  Failed to import breed "${breed.breed || breed.breed_name}":`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ Breed data seeded successfully`);
    console.log(`   Imported: ${imported} breeds`);
    if (skipped > 0) {
      console.log(`   Skipped: ${skipped} breeds (errors)`);
    }
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Breed data seeding failed:', error.message);
    if (error.stack) {
      console.error('   Stack trace:', error.stack);
    }
    return false;
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Check tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 'scenarios', 'production_data', 'transformation_data', 
        'transformation_products', 'breed_reference', 'breed_scenarios'
      )
      ORDER BY table_name
    `);
    
    console.log(`   ✅ ${tables.rows.length} core tables verified`);
    
    // Check breed data
    const breedCount = await pool.query('SELECT COUNT(*) FROM public.breed_reference');
    console.log(`   ✅ ${breedCount.rows[0].count} breeds in database`);
    
    // Check if any users exist
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`   ℹ️  ${userCount.rows[0].count} users in database`);
    
    console.log('\n✅ Setup verification complete!\n');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    // Step 1: Check database connection
    await checkDatabaseConnection();
    
    // Step 2: Run migration
    const migrationSuccess = await runMigration();
    if (!migrationSuccess) {
      console.error('\n❌ Setup failed at migration step');
      process.exit(1);
    }
    
    // Step 3: Seed breed data
    const seedSuccess = await seedBreedData();
    if (!seedSuccess) {
      console.error('\n❌ Setup failed at seeding step');
      process.exit(1);
    }
    
    // Step 4: Verify setup
    const verifySuccess = await verifySetup();
    if (!verifySuccess) {
      console.error('\n❌ Setup verification failed');
      process.exit(1);
    }
    
    console.log('============================================================================');
    console.log('🎉 Setup completed successfully!');
    console.log('============================================================================');
    console.log('\nNext steps:');
    console.log('  1. Start the server: npm run dev (in server directory)');
    console.log('  2. Start the client: npm run dev (in client directory)');
    console.log('  3. Open http://localhost:3000 in your browser');
    console.log('  4. Register a new user or login');
    console.log('\nFor production deployment:');
    console.log('  - Set up environment variables on your hosting platform');
    console.log('  - Configure SendGrid for email verification');
    console.log('  - See README.md for detailed instructions');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Setup failed with unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the setup
main();
