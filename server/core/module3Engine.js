/**
 * Module 3: Lactation / ECM Engine (MetaCaprine Scientific Intelligence)
 * 
 * This engine calculates Energy Corrected Milk (ECM) and breed production metrics
 * based on scientific breed reference data.
 * 
 * Formula: ECM(kg) = Milk(kg) × (0.327 + 0.122×Fat% + 0.077×Protein%)
 * 
 * Units: All in kg (display note: ≈ L via kg/1.03)
 * Fat + Protein: NOT "total solids" - specific sum of fat and protein only
 */

/**
 * Calculate fat kg from milk kg and fat percentage
 */
export function calcFatKg(milkKg, fatPct) {
  return milkKg * (fatPct / 100);
}

/**
 * Calculate protein kg from milk kg and protein percentage
 */
export function calcProteinKg(milkKg, proteinPct) {
  return milkKg * (proteinPct / 100);
}

/**
 * Calculate fat + protein percentage (NOT total solids)
 */
export function calcFatPlusProteinPct(fatPct, proteinPct) {
  return fatPct + proteinPct;
}

/**
 * Calculate fat + protein kg
 */
export function calcFatPlusProteinKg(milkKg, fatPct, proteinPct) {
  return calcFatKg(milkKg, fatPct) + calcProteinKg(milkKg, proteinPct);
}

/**
 * Calculate Energy Corrected Milk (ECM) in kg
 * 
 * ECM accounts for energy content based on fat and protein percentages
 * Formula from European dairy science standards
 * 
 * @param {number} milkKg - Milk production in kg
 * @param {number} fatPct - Fat percentage (e.g., 3.5)
 * @param {number} proteinPct - Protein percentage (e.g., 3.0)
 * @returns {number} ECM in kg
 */
export function calcECMkg(milkKg, fatPct, proteinPct) {
  return milkKg * (0.327 + 0.122 * fatPct + 0.077 * proteinPct);
}

/**
 * Calculate lifetime ECM
 * 
 * @param {number} ecmKgPerYear - ECM per year (or per lactation)
 * @param {number} lactationsLifetimeAvg - Average lactations per lifetime
 * @returns {number} Lifetime ECM in kg
 */
export function calcECMLifetimeKg(ecmKgPerYear, lactationsLifetimeAvg) {
  return ecmKgPerYear * lactationsLifetimeAvg;
}

/**
 * Build computed view for one breed reference with optional overrides
 * 
 * @param {object} breedRef - Base breed reference from database
 * @param {object} overrides - User overrides (optional)
 * @param {number} overrides.milk_kg_yr - Override milk kg per year
 * @param {number} overrides.fat_pct - Override fat percentage
 * @param {number} overrides.protein_pct - Override protein percentage
 * @param {number} overrides.lact_days_avg - Override lactation days average
 * @param {number} overrides.lactations_lifetime_avg - Override lactations per life
 * @param {number} overrides.herd_size - Herd size multiplier (for total calculations)
 * @returns {object} Computed breed scenario with all metrics
 */
export function buildBreedScenario(breedRef, overrides = {}) {
  // Use overrides if provided, otherwise use breed reference values
  const milk_kg_yr = Number(overrides.milk_kg_yr ?? breedRef.milk_kg_yr);
  const fat_pct = Number(overrides.fat_pct ?? breedRef.fat_pct);
  const protein_pct = Number(overrides.protein_pct ?? breedRef.protein_pct);
  const lact_days_avg = Number(overrides.lact_days_avg ?? breedRef.lact_days_avg);
  const lactations_lifetime_avg = Number(overrides.lactations_lifetime_avg ?? breedRef.lactations_lifetime_avg);
  const herd_size = Number(overrides.herd_size ?? 1);

  // Calculate derived values
  const fat_kg_yr = calcFatKg(milk_kg_yr, fat_pct);
  const protein_kg_yr = calcProteinKg(milk_kg_yr, protein_pct);
  const fat_plus_protein_pct = calcFatPlusProteinPct(fat_pct, protein_pct);
  const fat_plus_protein_kg_yr = fat_kg_yr + protein_kg_yr;

  const ecm_kg_yr = calcECMkg(milk_kg_yr, fat_pct, protein_pct);
  const ecm_kg_lifetime = calcECMLifetimeKg(ecm_kg_yr, lactations_lifetime_avg);

  // Herd scaling (scenario: 2000 Malagueñas vs 700 LaMancha, etc.)
  const scaled = {
    milk_kg_yr_total: milk_kg_yr * herd_size,
    fat_kg_yr_total: fat_kg_yr * herd_size,
    protein_kg_yr_total: protein_kg_yr * herd_size,
    fat_plus_protein_kg_yr_total: fat_plus_protein_kg_yr * herd_size,
    ecm_kg_yr_total: ecm_kg_yr * herd_size,
    ecm_kg_lifetime_total: ecm_kg_lifetime * herd_size
  };

  // Approximate liters (1 kg ≈ 1 L, or more precisely kg / 1.03)
  const milk_L_yr_approx = milk_kg_yr / 1.03;
  const milk_L_lifetime_approx = milk_L_yr_approx * lactations_lifetime_avg;

  return {
    breed_key: breedRef.breed_key,
    breed_name: breedRef.breed_name,
    country_or_system: breedRef.country_or_system,
    source_tags: breedRef.source_tags,
    notes: breedRef.notes,
    image_asset_key: breedRef.image_asset_key,
    
    // Input parameters (actual or overridden)
    lact_days_avg,
    lactations_lifetime_avg,
    fat_pct,
    protein_pct,
    fat_plus_protein_pct,
    
    // Per animal (annual)
    milk_kg_yr,
    milk_L_yr_approx,
    fat_kg_yr,
    protein_kg_yr,
    fat_plus_protein_kg_yr,
    ecm_kg_yr,
    
    // Per animal (lifetime)
    milk_kg_lifetime: milk_kg_yr * lactations_lifetime_avg,
    milk_L_lifetime_approx,
    fat_kg_lifetime: fat_kg_yr * lactations_lifetime_avg,
    protein_kg_lifetime: protein_kg_yr * lactations_lifetime_avg,
    fat_plus_protein_kg_lifetime: fat_plus_protein_kg_yr * lactations_lifetime_avg,
    ecm_kg_lifetime,
    
    // Herd totals
    herd_size,
    ...scaled,
    
    // Metadata
    approx_liters_note: `≈ ${Math.round(milk_L_yr_approx)} L/año (1 kg ≈ 1 L)`,
  };
}

/**
 * Compare two breed scenarios (A vs B)
 * Returns delta and winner by ECM lifetime
 * 
 * @param {object} aScenario - Scenario A (from buildBreedScenario)
 * @param {object} bScenario - Scenario B (from buildBreedScenario)
 * @returns {object} Comparison results
 */
export function compareTwo(aScenario, bScenario) {
  const delta = {
    ecm_kg_lifetime_total: aScenario.ecm_kg_lifetime_total - bScenario.ecm_kg_lifetime_total,
    ecm_kg_yr_total: aScenario.ecm_kg_yr_total - bScenario.ecm_kg_yr_total,
    fat_plus_protein_kg_yr_total: aScenario.fat_plus_protein_kg_yr_total - bScenario.fat_plus_protein_kg_yr_total,
    fat_kg_lifetime_total: (aScenario.fat_kg_lifetime * aScenario.herd_size) - (bScenario.fat_kg_lifetime * bScenario.herd_size),
    protein_kg_lifetime_total: (aScenario.protein_kg_lifetime * aScenario.herd_size) - (bScenario.protein_kg_lifetime * bScenario.herd_size),
  };
  
  const winner = (aScenario.ecm_kg_lifetime_total >= bScenario.ecm_kg_lifetime_total) ? "A" : "B";
  
  // Calculate percentages
  const ecmDeltaPercent = bScenario.ecm_kg_lifetime_total > 0 
    ? (delta.ecm_kg_lifetime_total / bScenario.ecm_kg_lifetime_total) * 100 
    : 0;
  
  return { 
    winner, 
    delta,
    ecmDeltaPercent,
    aScenario,
    bScenario
  };
}

/**
 * Rank scenarios by ECM lifetime
 * 
 * @param {array} list - Array of scenarios from buildBreedScenario
 * @param {string} mode - "per_head" or "total" (herd)
 * @returns {array} Sorted array of scenarios
 */
export function rankScenarios(list, mode = "per_head") {
  const key = mode === "total" ? "ecm_kg_lifetime_total" : "ecm_kg_lifetime";
  return [...list].sort((x, y) => Number(y[key]) - Number(x[key]));
}

/**
 * Validate breed scenario inputs
 * 
 * @param {object} overrides - User overrides to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateBreedScenario(overrides) {
  const errors = [];
  
  if (overrides.milk_kg_yr !== undefined) {
    const val = Number(overrides.milk_kg_yr);
    if (isNaN(val) || val < 0) errors.push('milk_kg_yr must be a positive number');
    if (val > 10000) errors.push('milk_kg_yr seems unrealistic (> 10000 kg)');
  }
  
  if (overrides.fat_pct !== undefined) {
    const val = Number(overrides.fat_pct);
    if (isNaN(val) || val < 0 || val > 20) errors.push('fat_pct must be between 0 and 20');
  }
  
  if (overrides.protein_pct !== undefined) {
    const val = Number(overrides.protein_pct);
    if (isNaN(val) || val < 0 || val > 20) errors.push('protein_pct must be between 0 and 20');
  }
  
  if (overrides.lact_days_avg !== undefined) {
    const val = Number(overrides.lact_days_avg);
    if (isNaN(val) || val < 100 || val > 400) errors.push('lact_days_avg must be between 100 and 400');
  }
  
  if (overrides.lactations_lifetime_avg !== undefined) {
    const val = Number(overrides.lactations_lifetime_avg);
    if (isNaN(val) || val < 1 || val > 10) errors.push('lactations_lifetime_avg must be between 1 and 10');
  }
  
  if (overrides.herd_size !== undefined) {
    const val = Number(overrides.herd_size);
    if (isNaN(val) || val < 1 || val > 100000) errors.push('herd_size must be between 1 and 100000');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
