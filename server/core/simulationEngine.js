/**
 * Shared Core Simulation Engine
 * 
 * This is the single source of truth for all calculations.
 * All modules use this engine to calculate results from scenario inputs.
 * 
 * Key principle: Each scenario is an independent "snapshot" with its own inputs.
 * Calculations are pure functions that take scenario data and return results.
 */

/**
 * Calculate production metrics from production data
 */
export function calculateProductionMetrics(productionData) {
  if (!productionData) return null;

  const {
    daily_production_liters = 0,
    production_days = 0,
    animals_count = 0,
  } = productionData;

  const totalProductionLiters = daily_production_liters * production_days * animals_count;

  return {
    totalProductionLiters,
    dailyProductionLiters: daily_production_liters,
    productionDays: production_days,
    animalsCount: animals_count,
  };
}

/**
 * Calculate costs from production data
 */
export function calculateCosts(productionData) {
  if (!productionData) return null;

  const {
    feed_cost_per_liter = 0,
    labor_cost_per_liter = 0,
    health_cost_per_liter = 0,
    infrastructure_cost_per_liter = 0,
    other_costs_per_liter = 0,
    daily_production_liters = 0,
    production_days = 0,
    animals_count = 0,
  } = productionData;

  const totalProductionLiters = daily_production_liters * production_days * animals_count;
  const costPerLiter = 
    feed_cost_per_liter +
    labor_cost_per_liter +
    health_cost_per_liter +
    infrastructure_cost_per_liter +
    other_costs_per_liter;

  const totalCosts = costPerLiter * totalProductionLiters;

  return {
    costPerLiter,
    totalCosts,
    feedCost: feed_cost_per_liter * totalProductionLiters,
    laborCost: labor_cost_per_liter * totalProductionLiters,
    healthCost: health_cost_per_liter * totalProductionLiters,
    infrastructureCost: infrastructure_cost_per_liter * totalProductionLiters,
    otherCosts: other_costs_per_liter * totalProductionLiters,
  };
}

/**
 * Calculate revenue from production data
 */
export function calculateRevenue(productionData) {
  if (!productionData) return null;

  const {
    milk_price_per_liter = 0,
    daily_production_liters = 0,
    production_days = 0,
    animals_count = 0,
  } = productionData;

  const totalProductionLiters = daily_production_liters * production_days * animals_count;
  const totalRevenue = milk_price_per_liter * totalProductionLiters;

  return {
    revenuePerLiter: milk_price_per_liter,
    totalRevenue,
  };
}

/**
 * Calculate transformation metrics (for dairy transformation module)
 */
export function calculateTransformationMetrics(productionData, transformationData) {
  if (!productionData || !transformationData) return null;

  const productionMetrics = calculateProductionMetrics(productionData);
  const {
    liters_per_kg_product = 0,
    processing_cost_per_liter = 0,
    product_price_per_kg = 0,
  } = transformationData;

  const totalLiters = productionMetrics.totalProductionLiters;
  const totalProductKg = totalLiters / liters_per_kg_product;
  const processingCost = processing_cost_per_liter * totalLiters;
  const productRevenue = product_price_per_kg * totalProductKg;

  return {
    totalProductKg,
    processingCost,
    productRevenue,
    revenuePerKg: product_price_per_kg,
    litersPerKg: liters_per_kg_product,
  };
}

/**
 * Calculate lactation impact (for lactation & productive life module)
 */
export function calculateLactationImpact(productionData, lactationData) {
  if (!productionData || !lactationData) return null;

  const {
    lactation_days = 0,
    dry_days = 0,
    productive_life_years = 0,
    replacement_rate = 0,
  } = lactationData;

  const cycleDays = lactation_days + dry_days;
  const cyclesPerYear = 365 / cycleDays;
  const productiveDays = productive_life_years * 365;
  const effectiveProductionDays = productiveDays * (lactation_days / cycleDays);

  return {
    cycleDays,
    cyclesPerYear,
    productiveDays,
    effectiveProductionDays,
    replacementRate: replacement_rate,
  };
}

/**
 * Calculate yield/conversion metrics (for yield module)
 */
export function calculateYieldMetrics(productionData, yieldData) {
  if (!productionData || !yieldData) return null;

  const productionMetrics = calculateProductionMetrics(productionData);
  const {
    conversion_rate = 0,
    efficiency_percentage = 100,
  } = yieldData;

  const totalLiters = productionMetrics.totalProductionLiters;
  const effectiveLiters = totalLiters * (efficiency_percentage / 100);
  const convertedProduct = effectiveLiters * conversion_rate;

  return {
    totalLiters,
    effectiveLiters,
    convertedProduct,
    conversionRate: conversion_rate,
    efficiencyPercentage: efficiency_percentage,
  };
}

/**
 * Main simulation function - calculates all results for a scenario
 * This is the single entry point for all calculations
 */
export function runSimulation(scenarioData) {
  const {
    productionData,
    transformationData,
    lactationData,
    yieldData,
    scenarioType,
  } = scenarioData;

  // Always calculate base production metrics
  const productionMetrics = calculateProductionMetrics(productionData);
  const costs = calculateCosts(productionData);
  const revenue = calculateRevenue(productionData);

  // Calculate base results
  const totalProductionLiters = productionMetrics?.totalProductionLiters || 0;
  let totalRevenue = revenue?.totalRevenue || 0;
  let totalCosts = costs?.totalCosts || 0;

  // Module-specific calculations
  let transformationMetrics = null;
  let lactationMetrics = null;
  let yieldMetrics = null;

  if (transformationData) {
    transformationMetrics = calculateTransformationMetrics(productionData, transformationData);
    // For transformation scenarios, use product revenue instead of milk revenue
    if (scenarioType === 'transformation') {
      totalRevenue = transformationMetrics.productRevenue;
      totalCosts += transformationMetrics.processingCost;
    }
  }

  if (lactationData) {
    lactationMetrics = calculateLactationImpact(productionData, lactationData);
    // Adjust production based on lactation cycle
    if (scenarioType === 'lactation') {
      const adjustedProduction = totalProductionLiters * 
        (lactationMetrics.effectiveProductionDays / lactationMetrics.productiveDays);
      // Recalculate with adjusted production
      const adjustedRevenue = (revenue?.revenuePerLiter || 0) * adjustedProduction;
      const adjustedCosts = (costs?.costPerLiter || 0) * adjustedProduction;
      totalRevenue = adjustedRevenue;
      totalCosts = adjustedCosts;
    }
  }

  if (yieldData) {
    yieldMetrics = calculateYieldMetrics(productionData, yieldData);
  }

  // Final calculations
  const grossMargin = totalRevenue - totalCosts;
  const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
  const revenuePerLiter = totalProductionLiters > 0 ? totalRevenue / totalProductionLiters : 0;
  const costPerLiter = totalProductionLiters > 0 ? totalCosts / totalProductionLiters : 0;

  return {
    totalProductionLiters,
    totalRevenue,
    totalCosts,
    grossMargin,
    marginPercentage,
    revenuePerLiter,
    costPerLiter,
    productionMetrics,
    costs,
    revenue,
    transformationMetrics,
    lactationMetrics,
    yieldMetrics,
  };
}
