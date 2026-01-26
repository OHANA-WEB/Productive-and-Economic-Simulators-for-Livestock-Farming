import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { runSimulation } from '../core/simulationEngine.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all scenarios for the authenticated user
router.get('/', async (req, res) => {
  try {
    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM scenarios WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get scenarios error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get a single scenario with all its data
router.get('/:id', async (req, res) => {
  try {
    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    
    const scenarioId = parseInt(req.params.id);

    // Verify scenario belongs to user
    const scenarioResult = await pool.query(
      'SELECT * FROM scenarios WHERE id = $1 AND user_id = $2',
      [scenarioId, req.user.userId]
    );

    if (scenarioResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }

    const scenario = scenarioResult.rows[0];

    // Get all related data
    const [productionData, transformationData, transformationProducts, lactationData, yieldData, results] = await Promise.all([
      pool.query('SELECT * FROM production_data WHERE scenario_id = $1', [scenarioId]),
      pool.query('SELECT * FROM transformation_data WHERE scenario_id = $1', [scenarioId]),
      pool.query('SELECT * FROM transformation_products WHERE scenario_id = $1 ORDER BY id', [scenarioId]),
      pool.query('SELECT * FROM lactation_data WHERE scenario_id = $1', [scenarioId]),
      pool.query('SELECT * FROM yield_data WHERE scenario_id = $1', [scenarioId]),
      pool.query('SELECT * FROM results WHERE scenario_id = $1', [scenarioId]),
    ]);

    res.json({
      ...scenario,
      productionData: productionData.rows[0] || null,
      transformationData: transformationData.rows[0] || null, // Keep for backward compatibility
      transformationProducts: transformationProducts.rows || [], // New: array of products
      lactationData: lactationData.rows[0] || null,
      yieldData: yieldData.rows[0] || null,
      results: results.rows[0] || null,
    });
  } catch (error) {
    console.error('Get scenario error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create a new scenario
router.post('/', async (req, res) => {
  try {
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    const result = await pool.query(
      'INSERT INTO scenarios (user_id, name, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, name, type, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create scenario error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Scenario name already exists for this user' });
    }
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Duplicate a scenario
router.post('/:id/duplicate', async (req, res) => {
  try {
    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    
    const scenarioId = parseInt(req.params.id);
    const { name } = req.body;

    // Get original scenario
    const originalResult = await pool.query(
      'SELECT * FROM scenarios WHERE id = $1 AND user_id = $2',
      [scenarioId, req.user.userId]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    const original = originalResult.rows[0];
    const newName = name || `${original.name} (Copy)`;

    // Create new scenario
    const newScenarioResult = await pool.query(
      'INSERT INTO scenarios (user_id, name, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, newName, original.type, original.description]
    );

    const newScenario = newScenarioResult.rows[0];

    // Copy all related data
    await Promise.all([
      pool.query(
        `INSERT INTO production_data (scenario_id, daily_production_liters, production_days, animals_count,
         feed_cost_per_liter, labor_cost_per_liter, health_cost_per_liter, infrastructure_cost_per_liter,
         other_costs_per_liter, milk_price_per_liter)
         SELECT $1, daily_production_liters, production_days, animals_count,
         feed_cost_per_liter, labor_cost_per_liter, health_cost_per_liter, infrastructure_cost_per_liter,
         other_costs_per_liter, milk_price_per_liter
         FROM production_data WHERE scenario_id = $2`,
        [newScenario.id, scenarioId]
      ),
      pool.query(
        `INSERT INTO transformation_data (
          scenario_id, product_type, liters_per_kg_product,
          processing_cost_per_liter, product_price_per_kg,
          sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
          direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
        )
         SELECT $1, product_type, liters_per_kg_product, processing_cost_per_liter, product_price_per_kg,
         sales_channel_direct_percentage, sales_channel_distributors_percentage, sales_channel_third_percentage,
         direct_sale_price_per_kg, distributors_price_per_kg, third_channel_price_per_kg
         FROM transformation_data WHERE scenario_id = $2`,
        [newScenario.id, scenarioId]
      ),
      pool.query(
        `INSERT INTO lactation_data (scenario_id, lactation_days, dry_days, productive_life_years, replacement_rate)
         SELECT $1, lactation_days, dry_days, productive_life_years, replacement_rate
         FROM lactation_data WHERE scenario_id = $2`,
        [newScenario.id, scenarioId]
      ),
      pool.query(
        `INSERT INTO yield_data (scenario_id, conversion_rate, efficiency_percentage)
         SELECT $1, conversion_rate, efficiency_percentage
         FROM yield_data WHERE scenario_id = $2`,
        [newScenario.id, scenarioId]
      ),
    ]);

    res.status(201).json(newScenario);
  } catch (error) {
    console.error('Duplicate scenario error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update scenario
router.put('/:id', async (req, res) => {
  try {
    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    const scenarioId = parseInt(req.params.id);
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE scenarios SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, description, scenarioId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update scenario error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete scenario
router.delete('/:id', async (req, res) => {
  try {
    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    const scenarioId = parseInt(req.params.id);

    const result = await pool.query(
      'DELETE FROM scenarios WHERE id = $1 AND user_id = $2 RETURNING *',
      [scenarioId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    console.error('Delete scenario error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Compare multiple scenarios
router.post('/compare', async (req, res) => {
  try {
    const { scenarioIds } = req.body;

    if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      return res.status(400).json({ error: 'scenarioIds array is required' });
    }

    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    const userId = req.user.userId;

    // Verify all scenarios belong to user
    const scenariosResult = await pool.query(
      `SELECT s.*, 
       pd.*, td.*, ld.*, yd.*, r.*
       FROM scenarios s
       LEFT JOIN production_data pd ON s.id = pd.scenario_id
       LEFT JOIN transformation_data td ON s.id = td.scenario_id
       LEFT JOIN lactation_data ld ON s.id = ld.scenario_id
       LEFT JOIN yield_data yd ON s.id = yd.scenario_id
       LEFT JOIN results r ON s.id = r.scenario_id
       WHERE s.id = ANY($1::int[]) AND s.user_id = $2`,
      [scenarioIds, userId]
    );

    if (scenariosResult.rows.length !== scenarioIds.length) {
      return res.status(404).json({ error: 'One or more scenarios not found' });
    }

    // Load transformation products for all scenarios
    const transformationProductsResult = await pool.query(
      'SELECT * FROM transformation_products WHERE scenario_id = ANY($1::int[]) ORDER BY scenario_id, id',
      [scenarioIds]
    );

    // Group transformation products by scenario_id
    const productsByScenario = {};
    transformationProductsResult.rows.forEach(product => {
      if (!productsByScenario[product.scenario_id]) {
        productsByScenario[product.scenario_id] = [];
      }
      productsByScenario[product.scenario_id].push(product);
    });

    // Run simulation for each scenario
    const comparisons = scenariosResult.rows.map(row => {
      // Build transformationData (legacy) or transformationProducts (new)
      const scenarioProducts = productsByScenario[row.id] || [];
      
      const scenarioData = {
        productionData: row.daily_production_liters ? {
          daily_production_liters: row.daily_production_liters,
          production_days: row.production_days,
          animals_count: row.animals_count,
          feed_cost_per_liter: row.feed_cost_per_liter,
          labor_cost_per_liter: row.labor_cost_per_liter,
          health_cost_per_liter: row.health_cost_per_liter,
          infrastructure_cost_per_liter: row.infrastructure_cost_per_liter,
          other_costs_per_liter: row.other_costs_per_liter,
          milk_price_per_liter: row.milk_price_per_liter,
        } : null,
        transformationData: (scenarioProducts.length === 0 && row.product_type) ? {
          product_type: row.product_type,
          liters_per_kg_product: row.liters_per_kg_product,
          processing_cost_per_liter: row.processing_cost_per_liter,
          product_price_per_kg: row.product_price_per_kg,
        } : null,
        transformationProducts: scenarioProducts.length > 0 ? scenarioProducts : null,
        lactationData: row.lactation_days ? {
          lactation_days: row.lactation_days,
          dry_days: row.dry_days,
          productive_life_years: row.productive_life_years,
          replacement_rate: row.replacement_rate,
        } : null,
        yieldData: row.conversion_rate ? {
          conversion_rate: row.conversion_rate,
          efficiency_percentage: row.efficiency_percentage,
        } : null,
        scenarioType: row.type,
      };

      const simulationResults = runSimulation(scenarioData);

      return {
        scenario: {
          id: row.id,
          name: row.name,
          type: row.type,
          description: row.description,
        },
        results: simulationResults,
      };
    });

    res.json(comparisons);
  } catch (error) {
    console.error('Compare scenarios error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
