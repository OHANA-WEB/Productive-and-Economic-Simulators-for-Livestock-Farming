-- ============================================================================
-- MVP Web - Complete Database Migration
-- Single consolidated migration file for clean deployment
-- Generated: February 4, 2026
-- ============================================================================

-- ============================================================================
-- CORE SCHEMA - Users and Scenarios
-- ============================================================================

-- Users table with email verification support
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  -- Email verification fields
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_token_expires TIMESTAMP,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);

-- Set existing users as verified (for backward compatibility)
UPDATE users SET email_verified = true WHERE email_verified = false AND id IN (SELECT id FROM users);

-- ============================================================================
-- Scenarios table (core entity - each scenario is an independent "snapshot")
-- ============================================================================
CREATE TABLE IF NOT EXISTS scenarios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'milk_sale', 'transformation', 'lactation', 'yield', 'summary'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);

-- ============================================================================
-- MODULE 1: PRODUCTION DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Production inputs
  daily_production_liters DECIMAL(10, 2),
  production_days INTEGER,
  animals_count INTEGER,
  -- Costs
  feed_cost_per_liter DECIMAL(10, 2),
  labor_cost_per_liter DECIMAL(10, 2),
  health_cost_per_liter DECIMAL(10, 2),
  infrastructure_cost_per_liter DECIMAL(10, 2),
  other_costs_per_liter DECIMAL(10, 2),
  -- Prices
  milk_price_per_liter DECIMAL(10, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_production_data_scenario_id ON production_data(scenario_id);

-- ============================================================================
-- MODULE 2: TRANSFORMATION DATA
-- ============================================================================

-- Main transformation_data table (legacy support)
CREATE TABLE IF NOT EXISTS transformation_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Transformation inputs
  product_type VARCHAR(100), -- 'queso_fresco', 'queso_madurado', etc.
  product_type_custom VARCHAR(255), -- Custom product name
  liters_per_kg_product DECIMAL(10, 2),
  processing_cost_per_liter DECIMAL(10, 2),
  packaging_cost_per_kg DECIMAL(10, 2) DEFAULT 0,
  product_price_per_kg DECIMAL(10, 2), -- Legacy field, kept for backward compatibility
  -- Sales channels (3 channels: direct, distributors, third/mixed)
  sales_channel_direct_percentage DECIMAL(5, 2) DEFAULT 100.00,
  sales_channel_distributors_percentage DECIMAL(5, 2) DEFAULT 0.00,
  sales_channel_third_percentage DECIMAL(5, 2) DEFAULT 0.00,
  direct_sale_price_per_kg DECIMAL(10, 2),
  distributors_price_per_kg DECIMAL(10, 2),
  third_channel_price_per_kg DECIMAL(10, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id),
  CONSTRAINT check_sales_channels_sum CHECK (
    COALESCE(sales_channel_direct_percentage, 0) + 
    COALESCE(sales_channel_distributors_percentage, 0) + 
    COALESCE(sales_channel_third_percentage, 0) = 100.00
  )
);

CREATE INDEX IF NOT EXISTS idx_transformation_data_scenario_id ON transformation_data(scenario_id);

-- Product Mix table (multiple products per scenario)
CREATE TABLE IF NOT EXISTS transformation_products (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  product_type VARCHAR(100) NOT NULL, -- 'queso_fresco', 'queso_madurado', 'yogurt', 'otro', etc.
  product_type_custom VARCHAR(255), -- Custom name when product_type = 'otro'
  distribution_percentage DECIMAL(5, 2) NOT NULL CHECK (distribution_percentage >= 0 AND distribution_percentage <= 100),
  liters_per_kg_product DECIMAL(10, 2) NOT NULL,
  processing_cost_per_liter DECIMAL(10, 2) NOT NULL DEFAULT 0,
  processing_cost_per_kg DECIMAL(10, 2) DEFAULT 0,
  packaging_cost_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
  packaging_cost_per_liter DECIMAL(10, 2) DEFAULT 0,
  -- Unit selection for costs
  processing_cost_unit VARCHAR(10) DEFAULT 'liter' CHECK (processing_cost_unit IN ('liter', 'kg')),
  packaging_cost_unit VARCHAR(10) DEFAULT 'kg' CHECK (packaging_cost_unit IN ('liter', 'kg')),
  -- Sales channels per product (3 channels: direct, distributors, third/mixed)
  sales_channel_direct_percentage DECIMAL(5, 2) DEFAULT 100.00,
  sales_channel_distributors_percentage DECIMAL(5, 2) DEFAULT 0.00,
  sales_channel_third_percentage DECIMAL(5, 2) DEFAULT 0.00,
  direct_sale_price_per_kg DECIMAL(10, 2),
  distributors_price_per_kg DECIMAL(10, 2),
  third_channel_price_per_kg DECIMAL(10, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_product_sales_channels_sum CHECK (
    COALESCE(sales_channel_direct_percentage, 0) + 
    COALESCE(sales_channel_distributors_percentage, 0) + 
    COALESCE(sales_channel_third_percentage, 0) = 100.00
  )
);

CREATE INDEX IF NOT EXISTS idx_transformation_products_scenario_id ON transformation_products(scenario_id);

-- ============================================================================
-- MODULE 3: SCIENTIFIC BREED INTELLIGENCE (INDEPENDENT MODULE)
-- ============================================================================

-- Breed Reference Table (Master Data - Scientific breed data with ECM calculations)
CREATE TABLE IF NOT EXISTS public.breed_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_name TEXT NOT NULL UNIQUE, -- e.g. "Saanen", "Alpine", "LaMancha"
  breed_key TEXT NOT NULL UNIQUE, -- slug for code: e.g. "saanen", "alpine"
  country_or_system TEXT, -- metadata: "USA (ADGA/DHI)", "FR (INRAE)", "NL", etc.
  source_tags TEXT[], -- ["ADGA", "DHI", "USDA"] for traceability
  notes TEXT, -- explanatory notes (herd size context, etc.)

  -- Core inputs (all in kg for consistency; L approximated via kg/1.03)
  milk_kg_yr NUMERIC NOT NULL, -- annual milk production in kg
  fat_pct NUMERIC NOT NULL, -- fat percentage
  protein_pct NUMERIC NOT NULL, -- protein percentage
  lact_days_avg NUMERIC NOT NULL, -- average lactation days
  lactations_lifetime_avg NUMERIC NOT NULL, -- average lactations per life

  -- Derived (precalculated for performance)
  fat_kg_yr NUMERIC NOT NULL,
  protein_kg_yr NUMERIC NOT NULL,
  fat_plus_protein_pct NUMERIC NOT NULL,
  fat_plus_protein_kg_yr NUMERIC NOT NULL,
  ecm_kg_yr NUMERIC NOT NULL, -- Energy Corrected Milk per year
  ecm_kg_lifetime NUMERIC NOT NULL, -- ECM lifetime (yr * lactations)

  -- Display helpers
  approx_liters_note TEXT, -- "≈ 1183 L/año (1 kg ≈ 1 L)"
  image_asset_key TEXT, -- key for breed image

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ranking queries (most important for Module 3)
CREATE INDEX IF NOT EXISTS idx_breed_reference_rank ON public.breed_reference (ecm_kg_lifetime DESC);
CREATE INDEX IF NOT EXISTS idx_breed_reference_key ON public.breed_reference (breed_key);

-- User Breed Scenarios (custom simulations with overrides)
CREATE TABLE IF NOT EXISTS public.breed_scenarios (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  breed_key TEXT NOT NULL REFERENCES breed_reference(breed_key),
  
  -- User overrides (optional)
  herd_size INTEGER DEFAULT 1,
  milk_kg_yr_override NUMERIC,
  fat_pct_override NUMERIC,
  protein_pct_override NUMERIC,
  lact_days_avg_override NUMERIC,
  lactations_lifetime_avg_override NUMERIC,

  -- Calculated results (stored for quick retrieval)
  calculated_fat_kg_yr NUMERIC,
  calculated_protein_kg_yr NUMERIC,
  calculated_ecm_kg_yr NUMERIC,
  calculated_ecm_kg_lifetime NUMERIC,
  calculated_ecm_kg_lifetime_total NUMERIC, -- herd total

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(scenario_id, breed_key)
);

COMMENT ON TABLE public.breed_reference IS 'Module 3: Scientific breed reference data with ECM calculations (INDEPENDENT MODULE)';
COMMENT ON TABLE public.breed_scenarios IS 'Module 3: User breed simulation scenarios with overrides';

-- ============================================================================
-- LEGACY MODULE 3: LACTATION DATA (Deprecated, kept for backward compatibility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lactation_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Lactation inputs
  lactation_days INTEGER,
  dry_days INTEGER,
  productive_life_years DECIMAL(5, 2),
  replacement_rate DECIMAL(5, 2), -- percentage
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_lactation_data_scenario_id ON lactation_data(scenario_id);

COMMENT ON TABLE lactation_data IS 'DEPRECATED: Legacy manual lactation data. Module 3 now uses breed_reference and breed_scenarios instead.';

-- ============================================================================
-- BREED PROFILES (Scientific Database - Alternative approach, currently not in use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS breed_profiles (
  id SERIAL PRIMARY KEY,
  breed_name VARCHAR(100) NOT NULL UNIQUE,
  breed_category VARCHAR(50) NOT NULL CHECK (breed_category IN ('dairy', 'dual_purpose', 'native')),
  
  -- Production characteristics (optimal management level)
  avg_daily_peak_liters DECIMAL(6, 2) NOT NULL,
  peak_day INTEGER NOT NULL,
  total_lactation_liters DECIMAL(10, 2) NOT NULL,
  standard_lactation_days INTEGER NOT NULL DEFAULT 305,
  persistence_rate DECIMAL(5, 2) NOT NULL,
  
  -- Milk composition
  fat_percentage DECIMAL(4, 2) NOT NULL,
  protein_percentage DECIMAL(4, 2) NOT NULL,
  lactose_percentage DECIMAL(4, 2) DEFAULT 4.80,
  total_solids_percentage DECIMAL(4, 2) NOT NULL,
  
  -- Reproductive cycle
  optimal_dry_period_days INTEGER DEFAULT 60,
  avg_calving_interval_days INTEGER DEFAULT 395,
  
  -- Management level adjustments
  low_management_multiplier DECIMAL(4, 2) DEFAULT 0.70,
  medium_management_multiplier DECIMAL(4, 2) DEFAULT 0.85,
  high_management_multiplier DECIMAL(4, 2) DEFAULT 0.95,
  
  -- References
  source VARCHAR(255),
  region VARCHAR(100),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_breed_profiles_name ON breed_profiles(breed_name);
CREATE INDEX IF NOT EXISTS idx_breed_profiles_category ON breed_profiles(breed_category);

-- Lactation simulations table (linked to breed_profiles, currently not in use)
CREATE TABLE IF NOT EXISTS lactation_simulations (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  
  -- User inputs
  selected_breed VARCHAR(100) NOT NULL,
  management_level VARCHAR(20) NOT NULL CHECK (management_level IN ('low', 'medium', 'high', 'optimal')),
  target_lactation_days INTEGER,
  
  -- Calculated outputs
  calculated_daily_peak DECIMAL(10, 2),
  calculated_lactation_total DECIMAL(12, 2),
  calculated_persistence DECIMAL(5, 2),
  calculated_fat_kg DECIMAL(10, 2),
  calculated_protein_kg DECIMAL(10, 2),
  calculated_solids_kg DECIMAL(10, 2),
  calculated_lactose_kg DECIMAL(10, 2),
  
  -- Economic outputs
  calculated_milk_value DECIMAL(12, 2),
  calculated_solids_value DECIMAL(12, 2),
  
  -- Comparison data
  comparison_breeds JSONB,
  optimization_potential JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_lactation_simulations_scenario ON lactation_simulations(scenario_id);
CREATE INDEX IF NOT EXISTS idx_lactation_simulations_breed ON lactation_simulations(selected_breed);

-- ============================================================================
-- YIELD DATA (Module 4 - Yield/Conversion module)
-- ============================================================================
CREATE TABLE IF NOT EXISTS yield_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Yield inputs
  conversion_rate DECIMAL(10, 4), -- liters to product conversion
  efficiency_percentage DECIMAL(5, 2),
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_yield_data_scenario_id ON yield_data(scenario_id);

-- ============================================================================
-- RESULTS TABLE (Calculated outputs - shared across all modules)
-- ============================================================================
CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Calculated results
  total_production_liters DECIMAL(12, 2),
  total_revenue DECIMAL(12, 2),
  total_costs DECIMAL(12, 2),
  gross_margin DECIMAL(12, 2),
  margin_percentage DECIMAL(5, 2),
  -- Additional metrics
  revenue_per_liter DECIMAL(10, 2),
  cost_per_liter DECIMAL(10, 2),
  -- Metadata
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_results_scenario_id ON results(scenario_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'scenarios', 'production_data', 'transformation_data', 
    'transformation_products', 'breed_reference', 'breed_scenarios',
    'lactation_data', 'breed_profiles', 'lactation_simulations',
    'yield_data', 'results'
  );
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created/verified % tables', table_count;
  RAISE NOTICE '============================================================================';
  
  IF table_count < 10 THEN
    RAISE WARNING 'Expected at least 10 tables, got %. Some tables may not have been created.', table_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Run: node server/scripts/seed-breed-reference.js (to populate breed data)
-- 2. Verify all tables were created successfully
-- 3. Test application functionality
-- ============================================================================
