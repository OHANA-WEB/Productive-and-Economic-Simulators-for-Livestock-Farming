// Initial mock data for demo mode
// This data is stored in localStorage and persists across sessions

export function getInitialMockData() {
  return {
    users: [
      {
        id: 1,
        email: 'demo@test.com',
        name: 'Demo User',
        password: 'demo123', // For demo purposes only
      },
      {
        id: 2,
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'admin123', // For demo purposes only
      },
    ],
    scenarios: [
      {
        id: 1,
        user_id: 1,
        name: 'Producción Leche - Escenario Base',
        type: 'milk_sale',
        description: 'Escenario base de producción y venta de leche',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        name: 'Transformación a Queso Fresco',
        type: 'transformation',
        description: 'Comparación venta directa vs transformación',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        user_id: 1,
        name: 'Análisis de Lactancia',
        type: 'lactation',
        description: 'Impacto de ciclo de lactancia en rentabilidad',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        user_id: 1,
        name: 'Rendimiento y Conversión',
        type: 'yield',
        description: 'Análisis de eficiencia de conversión',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    productionData: [
      {
        id: 1,
        scenario_id: 1,
        daily_production_liters: 2.5,
        production_days: 365,
        animals_count: 50,
        feed_cost_per_liter: 0.15,
        labor_cost_per_liter: 0.08,
        health_cost_per_liter: 0.05,
        infrastructure_cost_per_liter: 0.10,
        other_costs_per_liter: 0.07,
        milk_price_per_liter: 0.60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        scenario_id: 2,
        daily_production_liters: 2.5,
        production_days: 365,
        animals_count: 50,
        feed_cost_per_liter: 0.15,
        labor_cost_per_liter: 0.08,
        health_cost_per_liter: 0.05,
        infrastructure_cost_per_liter: 0.10,
        other_costs_per_liter: 0.07,
        milk_price_per_liter: 0.60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        scenario_id: 3,
        daily_production_liters: 2.5,
        production_days: 365,
        animals_count: 50,
        feed_cost_per_liter: 0.15,
        labor_cost_per_liter: 0.08,
        health_cost_per_liter: 0.05,
        infrastructure_cost_per_liter: 0.10,
        other_costs_per_liter: 0.07,
        milk_price_per_liter: 0.60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        scenario_id: 4,
        daily_production_liters: 2.5,
        production_days: 365,
        animals_count: 50,
        feed_cost_per_liter: 0.15,
        labor_cost_per_liter: 0.08,
        health_cost_per_liter: 0.05,
        infrastructure_cost_per_liter: 0.10,
        other_costs_per_liter: 0.07,
        milk_price_per_liter: 0.60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    transformationData: [
      {
        id: 1,
        scenario_id: 2,
        product_type: 'queso_fresco',
        liters_per_kg_product: 8.5,
        processing_cost_per_liter: 0.12,
        product_price_per_kg: 6.50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    lactationData: [
      {
        id: 1,
        scenario_id: 3,
        lactation_days: 280,
        dry_days: 85,
        productive_life_years: 6.5,
        replacement_rate: 15.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    yieldData: [
      {
        id: 1,
        scenario_id: 4,
        conversion_rate: 0.12,
        efficiency_percentage: 92.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    results: [
      {
        id: 1,
        scenario_id: 1,
        total_production_liters: 45625.00,
        total_revenue: 27375.00,
        total_costs: 20531.25,
        gross_margin: 6843.75,
        margin_percentage: 24.99,
        revenue_per_liter: 0.60,
        cost_per_liter: 0.45,
        calculated_at: new Date().toISOString(),
      },
      {
        id: 2,
        scenario_id: 2,
        total_production_liters: 45625.00,
        total_revenue: 34882.35,
        total_costs: 22031.25,
        gross_margin: 12851.10,
        margin_percentage: 36.84,
        revenue_per_liter: 0.76,
        cost_per_liter: 0.48,
        calculated_at: new Date().toISOString(),
      },
      {
        id: 3,
        scenario_id: 3,
        total_production_liters: 42000.00,
        total_revenue: 25200.00,
        total_costs: 18900.00,
        gross_margin: 6300.00,
        margin_percentage: 25.00,
        revenue_per_liter: 0.60,
        cost_per_liter: 0.45,
        calculated_at: new Date().toISOString(),
      },
      {
        id: 4,
        scenario_id: 4,
        total_production_liters: 45625.00,
        total_revenue: 27375.00,
        total_costs: 20531.25,
        gross_margin: 6843.75,
        margin_percentage: 24.99,
        revenue_per_liter: 0.60,
        cost_per_liter: 0.45,
        calculated_at: new Date().toISOString(),
      },
    ],
  };
}

// Calculate results based on scenario data (simplified version)
export function calculateMockResults(scenarioId, data) {
  const production = data.productionData.find(p => p.scenario_id === scenarioId);
  if (!production) return null;

  const totalLiters = production.daily_production_liters * production.production_days * production.animals_count;
  const costPerLiter = 
    production.feed_cost_per_liter +
    production.labor_cost_per_liter +
    production.health_cost_per_liter +
    production.infrastructure_cost_per_liter +
    production.other_costs_per_liter;
  const totalCosts = costPerLiter * totalLiters;
  const totalRevenue = production.milk_price_per_liter * totalLiters;
  const grossMargin = totalRevenue - totalCosts;
  const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  return {
    total_production_liters: totalLiters,
    total_revenue: totalRevenue,
    total_costs: totalCosts,
    gross_margin: grossMargin,
    margin_percentage: marginPercentage,
    revenue_per_liter: production.milk_price_per_liter,
    cost_per_liter: costPerLiter,
  };
}
