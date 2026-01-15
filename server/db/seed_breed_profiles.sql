-- Seed Data: Scientific Breed Profiles
-- Purpose: Populate breed_profiles with international reference data
-- Sources: ICAR, USDA, FAO, University research
-- Date: 2026-01-15

-- Clear existing data (for re-seeding)
TRUNCATE TABLE breed_profiles RESTART IDENTITY CASCADE;

-- ============================================================================
-- DAIRY BREEDS (High Production)
-- ============================================================================

-- 1. HOLSTEIN (World's highest producing dairy breed)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Holstein', 'dairy',
  45.0, 50, 9500, 305, 6.00,
  3.60, 3.20, 4.80, 12.50,
  60, 395,
  0.65, 0.80, 0.92,
  'USDA-AIPL, ICAR Reference Database 2025',
  'North America, Europe',
  'Highest volume producer. Moderate solids. Requires intensive management and high-quality feed. Sensitive to heat stress in tropical climates.'
);

-- 2. JERSEY (High solids, premium milk quality)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Jersey', 'dairy',
  30.0, 55, 6500, 305, 5.00,
  5.20, 3.90, 4.90, 14.00,
  60, 385,
  0.70, 0.82, 0.93,
  'Jersey Cattle Society, ICAR 2025',
  'Channel Islands, USA, New Zealand',
  'Premium milk quality with highest fat and protein. Excellent feed efficiency. Small body size, easier calving. Ideal for artisan cheese and yogurt production.'
);

-- 3. PARDO SUIZO / BROWN SWISS (Balanced performance)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Pardo Suizo', 'dairy',
  38.0, 52, 8200, 305, 5.50,
  4.00, 3.50, 4.85, 12.80,
  60, 390,
  0.68, 0.83, 0.93,
  'Brown Swiss Association, European Dairy Genetics 2025',
  'Switzerland, USA, Latin America',
  'Excellent balance of volume and quality. Superior protein content ideal for cheese. Adaptable to various climates. Long productive life.'
);

-- ============================================================================
-- DUAL-PURPOSE & CROSSBREEDS (Tropical Adapted)
-- ============================================================================

-- 4. GIROLANDO (F1: Gir x Holstein - Tropical champion)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Girolando', 'dual_purpose',
  32.0, 60, 7000, 305, 7.00,
  4.10, 3.40, 4.80, 12.60,
  60, 400,
  0.72, 0.85, 0.94,
  'ABCG Brazil, Embrapa Dairy Cattle Research 2025',
  'Brazil, Tropical Latin America',
  'Outstanding heat tolerance and tick resistance. Combines Gir (Zebu) hardiness with Holstein productivity. Ideal for tropical pasture-based systems. Lower feed requirements than pure Holstein.'
);

-- 5. CRIOLLO LECHERO (Native adapted dairy)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Criollo Lechero', 'native',
  20.0, 50, 4500, 240, 8.00,
  4.50, 3.60, 4.85, 13.30,
  50, 380,
  0.75, 0.88, 0.95,
  'FAO Animal Genetic Resources, Latin American Native Breeds Network 2025',
  'Colombia, Venezuela, Central America',
  'Exceptional disease resistance and climate adaptation. Low input requirements. Premium milk quality for artisan products. Shorter natural lactation (240 days). Excellent longevity and low mortality.'
);

-- ============================================================================
-- ADDITIONAL BREEDS (For future expansion)
-- ============================================================================

-- 6. NORMANDE (Dual-purpose French breed)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Normande', 'dual_purpose',
  35.0, 55, 7500, 305, 6.00,
  4.30, 3.50, 4.80, 12.90,
  60, 390,
  0.70, 0.84, 0.93,
  'French Normande Association, INRAE 2025',
  'France, Europe',
  'Excellent for cheese production. Good meat conformation. Hardy and adaptable. High protein suitable for AOC cheese.'
);

-- 7. GYR (Pure Zebu dairy)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Gyr Lechero', 'dairy',
  25.0, 65, 5500, 305, 7.50,
  4.60, 3.50, 4.75, 13.10,
  60, 410,
  0.73, 0.86, 0.94,
  'ABCG Brazil, Indian Council of Agricultural Research 2025',
  'Brazil, India',
  'Superior heat tolerance. Excellent tick and parasite resistance. Suitable for low-input systems. Longer calving intervals. Base breed for Girolando crosses.'
);

-- 8. AYRSHIRE (Hardy dairy breed)
INSERT INTO breed_profiles (
  breed_name, breed_category,
  avg_daily_peak_liters, peak_day, total_lactation_liters, standard_lactation_days, persistence_rate,
  fat_percentage, protein_percentage, lactose_percentage, total_solids_percentage,
  optimal_dry_period_days, avg_calving_interval_days,
  low_management_multiplier, medium_management_multiplier, high_management_multiplier,
  source, region, notes
) VALUES (
  'Ayrshire', 'dairy',
  33.0, 52, 7800, 305, 5.80,
  4.10, 3.40, 4.85, 12.70,
  60, 390,
  0.69, 0.83, 0.93,
  'Ayrshire Breeders Association, UK Dairy Genetics 2025',
  'Scotland, Scandinavia, Canada',
  'Excellent grazing efficiency. Hardy and long-lived. Good udder health. Balanced milk composition. Adapts well to cool climates and pasture-based systems.'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  breed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO breed_count FROM breed_profiles;
  RAISE NOTICE 'Successfully seeded % breed profiles', breed_count;
  
  IF breed_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 breeds, got %', breed_count;
  END IF;
END $$;

-- Display summary
SELECT 
  breed_name,
  breed_category,
  total_lactation_liters,
  fat_percentage,
  protein_percentage,
  region
FROM breed_profiles
ORDER BY breed_category, total_lactation_liters DESC;

-- ============================================================================
-- SEED COMPLETE
-- ============================================================================
