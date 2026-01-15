/**
 * Scientific Lactation Curve Engine
 * 
 * Implements the Wood model for lactation curves:
 * Y(t) = a * t^b * e^(-c*t)
 * 
 * Where:
 * - Y(t) = milk yield at day t
 * - a = scaling factor (related to peak yield)
 * - b = shape parameter (rate of increase to peak)
 * - c = shape parameter (rate of decline after peak)
 * - t = days in milk
 * 
 * Reference: Wood, P. D. P. (1967). "Algebraic Model of the Lactation Curve in Cattle"
 */

/**
 * Calculate daily milk production using Wood's lactation curve model
 * @param {number} day - Days in milk (DIM)
 * @param {number} peakYield - Peak daily yield (liters)
 * @param {number} peakDay - Day of peak production
 * @param {number} persistenceRate - Monthly decline rate (%)
 * @returns {number} - Milk production for that day (liters)
 */
function calculateDailyYield(day, peakYield, peakDay, persistenceRate) {
  if (day <= 0) return 0;
  
  // Convert persistence rate to Wood model parameter c
  // Higher persistence = slower decline = lower c value
  const c = (persistenceRate / 100) / 30; // Convert monthly % to daily rate
  
  // Calculate parameter b from peak day
  // At peak: b/c = t_peak, so b = c * t_peak
  const b = c * peakDay;
  
  // Calculate scaling factor a from peak yield
  // At peak: Y_peak = a * t_peak^b * e^(-c*t_peak)
  // Solving for a: a = Y_peak / (t_peak^b * e^(-c*t_peak))
  const a = peakYield / (Math.pow(peakDay, b) * Math.exp(-c * peakDay));
  
  // Calculate yield for given day using Wood model
  const yield_t = a * Math.pow(day, b) * Math.exp(-c * day);
  
  return Math.max(0, yield_t); // Ensure non-negative
}

/**
 * Generate complete lactation curve data
 * @param {number} lactationDays - Total days of lactation
 * @param {number} peakYield - Peak daily yield (liters)
 * @param {number} peakDay - Day of peak production
 * @param {number} persistenceRate - Monthly decline rate (%)
 * @returns {Array} - Array of {day, yield} objects
 */
function generateLactationCurve(lactationDays, peakYield, peakDay, persistenceRate) {
  const curve = [];
  
  for (let day = 1; day <= lactationDays; day++) {
    const yield_t = calculateDailyYield(day, peakYield, peakDay, persistenceRate);
    curve.push({
      day: day,
      yield: parseFloat(yield_t.toFixed(2))
    });
  }
  
  return curve;
}

/**
 * Calculate total lactation production
 * @param {number} lactationDays - Total days of lactation
 * @param {number} peakYield - Peak daily yield (liters)
 * @param {number} peakDay - Day of peak production
 * @param {number} persistenceRate - Monthly decline rate (%)
 * @returns {number} - Total liters for entire lactation
 */
function calculateTotalLactation(lactationDays, peakYield, peakDay, persistenceRate) {
  let total = 0;
  
  for (let day = 1; day <= lactationDays; day++) {
    total += calculateDailyYield(day, peakYield, peakDay, persistenceRate);
  }
  
  return parseFloat(total.toFixed(2));
}

/**
 * Calculate milk composition outputs (kg of fat, protein, etc.)
 * @param {number} totalLiters - Total milk production (liters)
 * @param {object} composition - Composition percentages {fat, protein, lactose, solids}
 * @returns {object} - Composition in kg
 */
function calculateComposition(totalLiters, composition) {
  // Assume milk density of 1.03 kg/L
  const totalKg = totalLiters * 1.03;
  
  return {
    fat_kg: parseFloat((totalKg * composition.fat_percentage / 100).toFixed(2)),
    protein_kg: parseFloat((totalKg * composition.protein_percentage / 100).toFixed(2)),
    lactose_kg: parseFloat((totalKg * composition.lactose_percentage / 100).toFixed(2)),
    solids_kg: parseFloat((totalKg * composition.total_solids_percentage / 100).toFixed(2))
  };
}

/**
 * Apply management level adjustment to breed performance
 * @param {object} breedProfile - Breed profile from database
 * @param {string} managementLevel - 'low', 'medium', 'high', 'optimal'
 * @returns {object} - Adjusted breed parameters
 */
function applyManagementAdjustment(breedProfile, managementLevel) {
  let multiplier = 1.0; // Default to optimal
  
  switch (managementLevel) {
    case 'low':
      multiplier = parseFloat(breedProfile.low_management_multiplier) || 0.70;
      break;
    case 'medium':
      multiplier = parseFloat(breedProfile.medium_management_multiplier) || 0.85;
      break;
    case 'high':
      multiplier = parseFloat(breedProfile.high_management_multiplier) || 0.95;
      break;
    case 'optimal':
      multiplier = 1.0;
      break;
  }
  
  return {
    adjusted_peak_yield: parseFloat((breedProfile.avg_daily_peak_liters * multiplier).toFixed(2)),
    adjusted_total_lactation: parseFloat((breedProfile.total_lactation_liters * multiplier).toFixed(2)),
    peak_day: breedProfile.peak_day,
    persistence_rate: breedProfile.persistence_rate,
    composition: {
      fat_percentage: parseFloat(breedProfile.fat_percentage),
      protein_percentage: parseFloat(breedProfile.protein_percentage),
      lactose_percentage: parseFloat(breedProfile.lactose_percentage),
      total_solids_percentage: parseFloat(breedProfile.total_solids_percentage)
    }
  };
}

/**
 * Calculate optimization potential (comparing current management to optimal)
 * @param {object} breedProfile - Breed profile from database
 * @param {string} currentManagement - Current management level
 * @returns {object} - Optimization opportunities
 */
function calculateOptimizationPotential(breedProfile, currentManagement) {
  if (currentManagement === 'optimal') {
    return {
      has_potential: false,
      message: 'Already at optimal management level',
      improvement_percentage: 0,
      improvement_liters: 0
    };
  }
  
  const current = applyManagementAdjustment(breedProfile, currentManagement);
  const optimal = applyManagementAdjustment(breedProfile, 'optimal');
  
  const improvementLiters = optimal.adjusted_total_lactation - current.adjusted_total_lactation;
  const improvementPercentage = ((improvementLiters / current.adjusted_total_lactation) * 100);
  
  return {
    has_potential: true,
    current_total: current.adjusted_total_lactation,
    optimal_total: optimal.adjusted_total_lactation,
    improvement_liters: parseFloat(improvementLiters.toFixed(2)),
    improvement_percentage: parseFloat(improvementPercentage.toFixed(2)),
    next_level: currentManagement === 'low' ? 'medium' : (currentManagement === 'medium' ? 'high' : 'optimal'),
    recommendations: generateRecommendations(currentManagement, improvementPercentage)
  };
}

/**
 * Generate management recommendations
 * @param {string} currentLevel - Current management level
 * @param {number} potentialImprovement - Potential improvement percentage
 * @returns {Array} - Array of recommendation strings
 */
function generateRecommendations(currentLevel, potentialImprovement) {
  const recommendations = [];
  
  if (currentLevel === 'low') {
    recommendations.push('Improve pasture quality and rotational grazing');
    recommendations.push('Implement basic mineral and vitamin supplementation');
    recommendations.push('Establish regular veterinary health protocols');
    recommendations.push('Improve water access and quality');
  } else if (currentLevel === 'medium') {
    recommendations.push('Implement Total Mixed Ration (TMR) or balanced feeding');
    recommendations.push('Enhance milking parlor hygiene and efficiency');
    recommendations.push('Implement genetic selection program');
    recommendations.push('Invest in cooling systems for heat stress management');
  } else if (currentLevel === 'high') {
    recommendations.push('Fine-tune nutritional formulations based on production stages');
    recommendations.push('Implement precision feeding technologies');
    recommendations.push('Optimize reproductive management with timed AI protocols');
    recommendations.push('Advanced health monitoring and early disease detection');
  }
  
  if (potentialImprovement > 20) {
    recommendations.push('⚠️ Significant improvement possible - prioritize management upgrades');
  }
  
  return recommendations;
}

/**
 * Main simulation function - runs complete lactation simulation
 * @param {object} breedProfile - Breed profile from database
 * @param {string} managementLevel - Management level
 * @param {number} targetLactationDays - Target lactation days (or null for breed default)
 * @param {number} animalsCount - Number of animals in herd
 * @returns {object} - Complete simulation results
 */
function runLactationSimulation(breedProfile, managementLevel, targetLactationDays = null, animalsCount = 1) {
  // Apply management adjustments
  const adjusted = applyManagementAdjustment(breedProfile, managementLevel);
  
  // Use target lactation days or breed standard
  const lactationDays = targetLactationDays || breedProfile.standard_lactation_days;
  
  // Generate lactation curve
  const lactationCurve = generateLactationCurve(
    lactationDays,
    adjusted.adjusted_peak_yield,
    adjusted.peak_day,
    adjusted.persistence_rate
  );
  
  // Calculate total production
  const totalLactation = calculateTotalLactation(
    lactationDays,
    adjusted.adjusted_peak_yield,
    adjusted.peak_day,
    adjusted.persistence_rate
  );
  
  // Calculate composition
  const composition = calculateComposition(totalLactation, adjusted.composition);
  
  // Calculate optimization potential
  const optimization = calculateOptimizationPotential(breedProfile, managementLevel);
  
  // Calculate herd totals
  const herdTotals = {
    total_production: parseFloat((totalLactation * animalsCount).toFixed(2)),
    total_fat_kg: parseFloat((composition.fat_kg * animalsCount).toFixed(2)),
    total_protein_kg: parseFloat((composition.protein_kg * animalsCount).toFixed(2)),
    total_solids_kg: parseFloat((composition.solids_kg * animalsCount).toFixed(2))
  };
  
  return {
    breed_name: breedProfile.breed_name,
    management_level: managementLevel,
    lactation_days: lactationDays,
    animals_count: animalsCount,
    
    // Per animal metrics
    peak_yield: adjusted.adjusted_peak_yield,
    peak_day: adjusted.peak_day,
    total_lactation_liters: totalLactation,
    persistence_rate: adjusted.persistence_rate,
    
    // Composition (per animal)
    fat_kg: composition.fat_kg,
    protein_kg: composition.protein_kg,
    lactose_kg: composition.lactose_kg,
    solids_kg: composition.solids_kg,
    fat_percentage: adjusted.composition.fat_percentage,
    protein_percentage: adjusted.composition.protein_percentage,
    solids_percentage: adjusted.composition.total_solids_percentage,
    
    // Herd totals
    herd_totals: herdTotals,
    
    // Lactation curve data (for charting)
    lactation_curve: lactationCurve,
    
    // Optimization
    optimization_potential: optimization,
    
    // Reproductive cycle
    dry_period_days: breedProfile.optimal_dry_period_days,
    calving_interval_days: breedProfile.avg_calving_interval_days,
    cycles_per_year: parseFloat((365 / breedProfile.avg_calving_interval_days).toFixed(2))
  };
}

export {
  calculateDailyYield,
  generateLactationCurve,
  calculateTotalLactation,
  calculateComposition,
  applyManagementAdjustment,
  calculateOptimizationPotential,
  runLactationSimulation
};
