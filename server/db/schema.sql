-- MVP Web - Database Schema
-- Multi-user simulation system for livestock production

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenarios table (core entity - each scenario is an independent "snapshot")
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

-- Production Data (shared across modules)
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

-- Transformation Data (for dairy transformation module)
CREATE TABLE IF NOT EXISTS transformation_data (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  -- Transformation inputs
  product_type VARCHAR(100), -- 'queso_fresco', 'queso_madurado', etc.
  liters_per_kg_product DECIMAL(10, 2),
  processing_cost_per_liter DECIMAL(10, 2),
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

-- Lactation Data (for lactation & productive life module)
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

-- Yield/Conversion Data (for yield module)
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

-- Results table (calculated outputs - shared across all modules)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_production_data_scenario_id ON production_data(scenario_id);
CREATE INDEX IF NOT EXISTS idx_transformation_data_scenario_id ON transformation_data(scenario_id);
CREATE INDEX IF NOT EXISTS idx_lactation_data_scenario_id ON lactation_data(scenario_id);
CREATE INDEX IF NOT EXISTS idx_yield_data_scenario_id ON yield_data(scenario_id);
CREATE INDEX IF NOT EXISTS idx_results_scenario_id ON results(scenario_id);
