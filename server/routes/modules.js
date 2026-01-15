import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { runSimulation } from '../core/simulationEngine.js';
import { runLactationSimulation } from '../core/lactationEngine.js';

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

    // Validate and sanitize numeric values to prevent overflow
    // DECIMAL(10,2) range: -99999999.99 to 99999999.99
    // INTEGER range: -2147483648 to 2147483647
    const MAX_DECIMAL = 99999999.99;
    const MIN_DECIMAL = -99999999.99;
    const MAX_INTEGER = 2147483647;
    
    const sanitizeDecimal = (value) => {
      if (value === null || value === undefined) return null;
      const num = parseFloat(value);
      if (isNaN(num) || !isFinite(num)) return null;
      return Math.max(MIN_DECIMAL, Math.min(MAX_DECIMAL, num));
    };
    
    const sanitizeInteger = (value) => {
      if (value === null || value === undefined) return null;
      const num = parseInt(value);
      if (isNaN(num) || !isFinite(num)) return null;
      return Math.max(0, Math.min(MAX_INTEGER, Math.round(num)));
    };

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
        sanitizeDecimal(daily_production_liters),
        sanitizeInteger(production_days),
        sanitizeInteger(animals_count),
        sanitizeDecimal(feed_cost_per_liter),
        sanitizeDecimal(labor_cost_per_liter),
        sanitizeDecimal(health_cost_per_liter),
        sanitizeDecimal(infrastructure_cost_per_liter),
        sanitizeDecimal(other_costs_per_liter),
        sanitizeDecimal(milk_price_per_liter),
      ]
    );

    // Recalculate and save results
    await calculateAndSaveResults(pool, scenarioId);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving production data:', error);
    // Provide more user-friendly error messages
    if (error.message && error.message.includes('overflow')) {
      res.status(400).json({ error: 'One or more values are too large. Maximum value allowed is 99,999,999.99' });
    } else if (error.message && error.message.includes('numeric')) {
      res.status(400).json({ error: 'Invalid numeric value. Please check all input fields.' });
    } else {
      res.status(500).json({ error: error.message || 'Error saving data' });
    }
  }
});

// Module 2: Transformation - Save/Update transformation data
// Supports both legacy single product and new Product Mix (multiple products)
router.post('/transformation/:scenarioId', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);

    if (!(await verifyScenarioOwnership(pool, scenarioId, req.user.userId))) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    // Check if we're receiving products array (Product Mix) or single product (legacy)
    if (req.body.products && Array.isArray(req.body.products)) {
      // New Product Mix format - save multiple products
      const { products } = req.body;
      
      // Validate that distribution percentages sum to 100
      const totalPercentage = products.reduce((sum, p) => sum + (parseFloat(p.distribution_percentage) || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({ error: `Distribution percentages must sum to 100%. Current sum: ${totalPercentage.toFixed(2)}%` });
      }

      // Delete existing products for this scenario
      await pool.query('DELETE FROM transformation_products WHERE scenario_id = $1', [scenarioId]);

      // Insert new products
      const savedProducts = [];
      for (const product of products) {
        const {
          product_type,
          product_type_custom,
          distribution_percentage,
          liters_per_kg_product,
          processing_cost_per_liter,
          packaging_cost_per_kg,
          sales_channel_direct_percentage,
          sales_channel_distributors_percentage,
          sales_channel_third_percentage,
          direct_sale_price_per_kg,
          distributors_price_per_kg,
          third_channel_price_per_kg,
        } = product;

        const result = await pool.query(
          `INSERT INTO transformation_products (
            scenario_id, product_type, product_type_custom, distribution_percentage,
            liters_per_kg_product, processing_cost_per_liter, packaging_cost_per_kg,
            sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
            direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            scenarioId,
            product_type,
            product_type_custom || null,
            distribution_percentage,
            liters_per_kg_product || 0,
            processing_cost_per_liter || 0,
            packaging_cost_per_kg || 0,
            sales_channel_direct_percentage || 100,
            sales_channel_distributors_percentage || 0,
            sales_channel_third_percentage || 0,
            direct_sale_price_per_kg || null,
            distributors_price_per_kg || null,
            third_channel_price_per_kg || null,
          ]
        );
        savedProducts.push(result.rows[0]);
      }

      // Recalculate and save results
      await calculateAndSaveResults(pool, scenarioId);

      res.json({ products: savedProducts });
    } else {
      // Legacy single product format - maintain backward compatibility
      const {
        product_type,
        product_type_custom,
        liters_per_kg_product,
        processing_cost_per_liter,
        packaging_cost_per_kg,
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
          scenario_id, product_type, product_type_custom, liters_per_kg_product,
          processing_cost_per_liter, packaging_cost_per_kg, product_price_per_kg,
          sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
          direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (scenario_id) DO UPDATE SET
          product_type = EXCLUDED.product_type,
          product_type_custom = EXCLUDED.product_type_custom,
          liters_per_kg_product = EXCLUDED.liters_per_kg_product,
          processing_cost_per_liter = EXCLUDED.processing_cost_per_liter,
          packaging_cost_per_kg = EXCLUDED.packaging_cost_per_kg,
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
          scenarioId, product_type, product_type_custom || null, liters_per_kg_product, processing_cost_per_liter, 
          packaging_cost_per_kg || 0, product_price_per_kg,
          sales_channel_direct_percentage || 100, sales_channel_distributors_percentage || 0, sales_channel_third_percentage || 0,
          direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
        ]
      );

      // Recalculate and save results
      await calculateAndSaveResults(pool, scenarioId);

      res.json(result.rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Module 3: Lactation - Save/Update lactation data
// Module 3: Scientific Lactation - Save/Update lactation simulation
router.post('/lactation/:scenarioId', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);

    if (!(await verifyScenarioOwnership(pool, scenarioId, req.user.userId))) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    const {
      selected_breed,
      management_level,
      target_lactation_days,
    } = req.body;

    // Validate inputs
    if (!selected_breed || !management_level) {
      return res.status(400).json({ error: 'Breed and management level are required' });
    }

    if (!['low', 'medium', 'high', 'optimal'].includes(management_level)) {
      return res.status(400).json({ error: 'Invalid management level' });
    }

    // Get breed profile from database
    const breedResult = await pool.query(
      'SELECT * FROM breed_profiles WHERE breed_name = $1',
      [selected_breed]
    );

    if (breedResult.rows.length === 0) {
      return res.status(404).json({ error: `Breed profile not found: ${selected_breed}` });
    }

    const breedProfile = breedResult.rows[0];

    // Get production data to know animals count
    const productionResult = await pool.query(
      'SELECT animals_count FROM production_data WHERE scenario_id = $1',
      [scenarioId]
    );
    const animalsCount = productionResult.rows[0]?.animals_count || 1;

    // Run scientific lactation simulation
    const simulation = runLactationSimulation(
      breedProfile,
      management_level,
      target_lactation_days,
      animalsCount
    );

    // Save simulation results to database
    const result = await pool.query(
      `INSERT INTO lactation_simulations (
        scenario_id, selected_breed, management_level, target_lactation_days,
        calculated_daily_peak, calculated_lactation_total, calculated_persistence,
        calculated_fat_kg, calculated_protein_kg, calculated_solids_kg, calculated_lactose_kg,
        optimization_potential
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (scenario_id) DO UPDATE SET
        selected_breed = EXCLUDED.selected_breed,
        management_level = EXCLUDED.management_level,
        target_lactation_days = EXCLUDED.target_lactation_days,
        calculated_daily_peak = EXCLUDED.calculated_daily_peak,
        calculated_lactation_total = EXCLUDED.calculated_lactation_total,
        calculated_persistence = EXCLUDED.calculated_persistence,
        calculated_fat_kg = EXCLUDED.calculated_fat_kg,
        calculated_protein_kg = EXCLUDED.calculated_protein_kg,
        calculated_solids_kg = EXCLUDED.calculated_solids_kg,
        calculated_lactose_kg = EXCLUDED.calculated_lactose_kg,
        optimization_potential = EXCLUDED.optimization_potential,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        scenarioId,
        selected_breed,
        management_level,
        target_lactation_days || null,
        simulation.peak_yield,
        simulation.total_lactation_liters,
        simulation.persistence_rate,
        simulation.fat_kg,
        simulation.protein_kg,
        simulation.solids_kg,
        simulation.lactose_kg,
        JSON.stringify(simulation.optimization_potential)
      ]
    );

    // Return full simulation results (including lactation curve for charting)
    res.json({
      saved: result.rows[0],
      simulation: simulation
    });
  } catch (error) {
    console.error('Lactation simulation error:', error);
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
  const [scenario, productionData, transformationData, transformationProducts, lactationData, yieldData] = await Promise.all([
    pool.query('SELECT * FROM scenarios WHERE id = $1', [scenarioId]),
    pool.query('SELECT * FROM production_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM transformation_products WHERE scenario_id = $1 ORDER BY id', [scenarioId]),
    pool.query('SELECT * FROM lactation_data WHERE scenario_id = $1', [scenarioId]),
    pool.query('SELECT * FROM yield_data WHERE scenario_id = $1', [scenarioId]),
  ]);

  if (scenario.rows.length === 0) return;

  const scenarioData = {
    productionData: productionData.rows[0] || null,
    transformationData: transformationData.rows[0] || null, // Legacy single product
    transformationProducts: transformationProducts.rows || [], // New: array of products
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
