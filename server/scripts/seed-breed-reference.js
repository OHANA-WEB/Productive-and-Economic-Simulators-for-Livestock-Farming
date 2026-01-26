import dotenv from 'dotenv';
import { getPool } from '../db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed breed reference data from metacaprine_module3_breed_reference_ranked_ecm.json
 * This script populates the breed_reference table with scientific data
 */
async function seedBreedReference() {
  let pool;
  
  try {
    console.log('🌱 Seeding Module 3 Breed Reference data...');
    
    pool = getPool();
    if (!pool) {
      throw new Error('Failed to get database pool');
    }
    
    console.log('✓ Database pool obtained');

    // Read JSON data
    const jsonPath = path.join(__dirname, '../metacaprine_module3_breed_reference_ranked_ecm.json');
    console.log('📁 Reading JSON from:', jsonPath);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(rawData);
    console.log('✓ JSON file loaded successfully');

    const breeds = data.breeds;
    console.log(`📊 Found ${breeds.length} breeds to seed`);

    // Helper function to create breed_key from breed name
    const createBreedKey = (breedName) => {
      return breedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
        .replace(/^_+|_+$/g, ''); // Trim underscores
    };

    // Parse country/system from validation_source and breed name
    const parseCountrySystem = (breed) => {
      const source = breed.validation_source || '';
      const breedName = breed.breed || '';
      
      if (source === 'ADGA' || source.includes('ADGA')) return 'USA (ADGA/DHI)';
      if (source === 'INRAE') return 'FR (INRAE)';
      if (source === 'NL') return 'NL';
      if (source === 'BGS') return 'UK (BGS)';
      if (source.includes('España') || source.includes('CABRAMA') || source.includes('ACRIFLOR') || source.includes('ACRIM') || source.includes('MAPA')) return 'ES';
      if (source.includes('Francia')) return 'FR';
      if (source.includes('INTA')) return 'AR (INTA)';
      if (source.includes('INIFAP')) return 'MX (INIFAP)';
      if (source.includes('AGROSAVIA')) return 'CO (AGROSAVIA)';
      if (source.includes('INIA')) return 'Various (INIA)';
      if (source.includes('LATAM')) return 'LATAM';
      if (source.includes('Asociaciones')) return 'Global';
      if (source.includes('EU/Américas')) return 'EU/Americas';
      
      return source;
    };

    // Create notes based on available data
    const createNotes = (breed) => {
      const parts = [];
      if (breed.validation_source) {
        parts.push(`Source: ${breed.validation_source}`);
      }
      return parts.join('. ') || null;
    };

    let inserted = 0;
    let updated = 0;

    for (const breed of breeds) {
      const breedKey = createBreedKey(breed.breed);
      const countrySystem = parseCountrySystem(breed);
      const notes = createNotes(breed);
      
      // Parse source tags
      const sourceTags = breed.validation_source ? [breed.validation_source] : [];

      // Insert or update breed
      const result = await pool.query(
        `
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
        ON CONFLICT (breed_key) DO UPDATE SET
          breed_name = EXCLUDED.breed_name,
          country_or_system = EXCLUDED.country_or_system,
          source_tags = EXCLUDED.source_tags,
          notes = EXCLUDED.notes,
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
          image_asset_key = EXCLUDED.image_asset_key,
          updated_at = now()
        RETURNING (xmax = 0) AS inserted
        `,
        [
          breed.breed, // breed_name
          breedKey, // breed_key
          countrySystem, // country_or_system
          sourceTags, // source_tags
          notes, // notes
          breed.milk_per_lactation_kg, // milk_kg_yr
          breed.fat_pct, // fat_pct
          breed.protein_pct, // protein_pct
          breed.lactation_days_avg, // lact_days_avg
          breed.lactations_per_life_avg, // lactations_lifetime_avg
          breed.fat_kg_per_lactation, // fat_kg_yr
          breed.protein_kg_per_lactation, // protein_kg_yr
          breed.fat_pct + breed.protein_pct, // fat_plus_protein_pct
          breed.fat_plus_protein_kg_per_lactation, // fat_plus_protein_kg_yr
          breed.ecm_per_lactation_kg, // ecm_kg_yr
          breed.lifetime.ecm_kg, // ecm_kg_lifetime
          `≈ ${Math.round(breed.milk_per_lactation_L_approx)} L/año (1 kg ≈ 1 L)`, // approx_liters_note
          breedKey // image_asset_key (same as breed_key for now)
        ]
      );

      if (result.rows[0]?.inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    console.log(`✅ Breed reference data seeded successfully!`);
    console.log(`   📥 Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   📊 Total: ${breeds.length}`);

    // Show top 5 by ECM lifetime
    const top5 = await pool.query(`
      SELECT breed_name, ecm_kg_lifetime, country_or_system
      FROM public.breed_reference
      ORDER BY ecm_kg_lifetime DESC
      LIMIT 5
    `);

    console.log('\n🏆 Top 5 breeds by lifetime ECM:');
    top5.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.breed_name} (${row.country_or_system}): ${Number(row.ecm_kg_lifetime).toFixed(1)} kg ECM`);
    });

  } catch (error) {
    console.error('❌ Error seeding breed reference:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run if called directly - always run when executed
seedBreedReference()
  .then(() => {
    console.log('\n✅ Seed complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });

export default seedBreedReference;
