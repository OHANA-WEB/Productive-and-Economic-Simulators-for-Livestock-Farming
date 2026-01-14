import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { runSimulation } from '../core/simulationEngine.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper function to verify scenario ownership
async function verifyScenarioOwnership(pool, scenarioId, userId) {
  const result = await pool.query(
    'SELECT id FROM scenarios WHERE id = $1 AND user_id = $2',
    [scenarioId, userId]
  );
  return result.rows.length > 0;
}

// Module 1: Production & Sales - Save/Update production data
router.post('/production/:scenarioId', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);

    if (!(await verifyScenarioOwnership(pool, scenarioId, req.user.userId))) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    const {
      daily_production_liters,
      production_days,
      animals_count,
      feed_cost_per_liter,
      labor_cost_per_liter,
      health_cost_per_liter,
      infrastructure_cost_per_liter,
      other_costs_per_liter,
      milk_price_per_liter,
    } = req.body;

    // Upsert production data
    const result = await pool.query(
      `INSERT INTO production_data (
        scenario_id, daily_production_liters, production_days, animals_count,
        feed_cost_per_liter, labor_cost_per_liter, health_cost_per_liter,
        infrastructure_cost_per_liter, other_costs_per_liter, milk_price_per_liter
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (scenario_id) DO UPDATE SET
        daily_production_liters = EXCLUDED.daily_production_liters,
        production_days = EXCLUDED.production_days,
        animals_count = EXCLUDED.animals_count,
        feed_cost_per_liter = EXCLUDED.feed_cost_per_liter,
        labor_cost_per_liter = EXCLUDED.labor_cost_per_liter,
        health_cost_per_liter = EXCLUDED.health_cost_per_liter,
        infrastructure_cost_per_liter = EXCLUDED.infrastructure_cost_per_liter,
        other_costs_per_liter = EXCLUDED.other_costs_per_liter,
        milk_price_per_liter = EXCLUDED.milk_price_per_liter,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        scenarioId,
        daily_production_liters,
        production_days,
        animals_count,
        feed_cost_per_liter,
        labor_cost_per_liter,
        health_cost_per_liter,
        infrastructure_cost_per_liter,
        other_costs_per_liter,
        milk_price_per_liter,
      ]
    );

    // Recalculate and save results
    await calculateAndSaveResults(pool, scenarioId);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Module 2: Transformation - Save/Update transformation data
router.post('/transformation/:scenarioId', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);

    if (!(await verifyScenarioOwnership(pool, scenarioId, req.user.userId))) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    const {
      product_type,
      liters_per_kg_product,
      processing_cost_per_liter,
      product_price_per_kg, // Legacy field
      sales_channel_direct_percentage,
      sales_channel_distributors_percentage,
      sales_channel_third_percentage,
      direct_sale_price_per_kg,
      distributors_price_per_kg,
      third_channel_price_per_kg,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO transformation_data (
        scenario_id, product_type, liters_per_kg_product,
        processing_cost_per_liter, product_price_per_kg,
        sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
        direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (scenario_id) DO UPDATE SET
        product_type = EXCLUDED.product_type,
        liters_per_kg_product = EXCLUDED.liters_per_kg_product,
        processing_cost_per_liter = EXCLUDED.processing_cost_per_liter,
        product_price_per_kg = EXCLUDED.product_price_per_kg,
        sales_channel_direct_percentage = EXCLUDED.sales_channel_direct_percentage,
        sales_channel_distributors_percentage = EXCLUDED.sales_channel_distributors_percentage,
        sales_channel_third_percentage = EXCLUDED.sales_channel_third_percentage,
        direct_sale_price_per_kg = EXCLUDED.direct_sale_price_per_kg,
        distributors_price_per_kg = EXCLUDED.distributors_price_per_kg,
        third_channel_price_per_kg = EXCLUDED.third_channel_price_per_kg,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        scenarioId, product_type, liters_per_kg_product, processing_cost_per_liter, product_price_per_kg,
        sales_channel_direct_percentage || 100, sales_channel_distributors_percentage || 0, sales_channel_third_percentage || 0,
        direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
      ]
    );

    // Recalculate and save results
    await calculateAndSaveResults(pool, scenarioId);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Module 3: Lactation - Save/Update lactation data
router.post('/lactation/:scenarioId', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);

    if (!(await verifyScenarioOwnership(pool, scenarioId, req.user.userId))) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    const {
      lactation_days,
      dry_days,
      productive_life_years,
      replacement_rate,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO lactation_data (
        scenario_id, lactation_days, dry_days, productive_life_years, replacement_rate
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (scenario_id) DO UPDATE SET
        lactation_days = EXCLUDED.lactation_days,
        dry_days = EXCLUDED.dry_days,
        productive_life_years = EXCLUDED.productive_life_years,
        replacement_rate = EXCLUDED.replacement_rate,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [scenarioId, lactation_days, dry_days, productive_life_years, replacement_rate]
    );

    // Recalculate and save results
    await calculateAndSaveResults(pool, scenarioId);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Module 4: Yield - Save/Update yield data
router.post('/yield/:scenarioId', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);

    if (!(await verifyScenarioOwnership(pool, scenarioId, req.user.userId))) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    const {
      conversion_rate,
      efficiency_percentage,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO yield_data (scenario_id, conversion_rate, efficiency_percentage)
       VALUES ($1, $2, $3)
       ON CONFLICT (scenario_id) DO UPDATE SET
         conversion_rate = EXCLUDED.conversion_rate,
         efficiency_percentage = EXCLUDED.efficiency_percentage,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [scenarioId, conversion_rate, efficiency_percentage]
    );

    // Recalculate and save results
    await calculateAndSaveResults(pool, scenarioId);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate and save results
async function calculateAndSaveResults(pool, scenarioId) {
  // Get all scenario data
  const [scenario, productionData, transformationData, lactationData, yieldData] = await Promise.all([
    pool.query('SELECT * FROM scenarios WHERE id = $1', [scenarioId]),
    pool.query('SELECT * FROM production_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM lactation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM yield_data WHERE scenario_id = $1', [scenarioId]),
  ]);

  if (scenario.rows.length === 0) return;

  const scenarioData = {
    productionData: productionData.rows[0] || null,
    transformationData: transformationData.rows[0] || null,
    lactationData: lactationData.rows[0] || null,
    yieldData: yieldData.rows[0] || null,
    scenarioType: scenario.rows[0].type,
  };

  // Run simulation
  const results = runSimulation(scenarioData);

  // Save results
  await pool.query(
    `INSERT INTO results (
      scenario_id, total_production_liters, total_revenue, total_costs,
      gross_margin, margin_percentage, revenue_per_liter, cost_per_liter
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (scenario_id) DO UPDATE SET
      total_production_liters = EXCLUDED.total_production_liters,
      total_revenue = EXCLUDED.total_revenue,
      total_costs = EXCLUDED.total_costs,
      gross_margin = EXCLUDED.gross_margin,
      margin_percentage = EXCLUDED.margin_percentage,
      revenue_per_liter = EXCLUDED.revenue_per_liter,
      cost_per_liter = EXCLUDED.cost_per_liter,
      calculated_at = CURRENT_TIMESTAMP`,
    [
      scenarioId,
      results.totalProductionLiters,
      results.totalRevenue,
      results.totalCosts,
      results.grossMargin,
      results.marginPercentage,
      results.revenuePerLiter,
      results.costPerLiter,
    ]
  );
}

export default router;
