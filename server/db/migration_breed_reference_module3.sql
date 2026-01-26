-- Module 3: Breed Reference Table (MetaCaprine Scientific Intelligence)
-- This table stores scientific breed data with ECM calculations for lifetime production comparison

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

-- Index for ranking queries (most important)
CREATE INDEX IF NOT EXISTS idx_breed_reference_rank ON public.breed_reference (ecm_kg_lifetime DESC);

-- Index for breed lookups
CREATE INDEX IF NOT EXISTS idx_breed_reference_key ON public.breed_reference (breed_key);

-- Module 3: User Breed Scenarios (custom simulations)
CREATE TABLE IF NOT EXISTS public.breed_scenarios (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  breed_key TEXT NOT NULL REFERENCES breed_reference(breed_key),
  
  -- User overrides (optional)
  herd_size INTEGER DEFAULT 1,
  milk_kg_yr_override NUMERIC, -- user can override base values
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

COMMENT ON TABLE public.breed_reference IS 'Module 3: Scientific breed reference data with ECM calculations';
COMMENT ON TABLE public.breed_scenarios IS 'Module 3: User breed simulation scenarios with overrides';
