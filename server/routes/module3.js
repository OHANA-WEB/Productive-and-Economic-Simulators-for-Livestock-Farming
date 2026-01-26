import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { buildBreedScenario, compareTwo, rankScenarios, validateBreedScenario } from '../core/module3Engine.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/module3/breeds
 * List all breeds ordered by ECM lifetime (descending)
 */
router.get('/breeds', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        id, breed_name, breed_key, country_or_system, source_tags, notes,
        milk_kg_yr, fat_pct, protein_pct, lact_days_avg, lactations_lifetime_avg,
        fat_kg_yr, protein_kg_yr, fat_plus_protein_pct, fat_plus_protein_kg_yr,
        ecm_kg_yr, ecm_kg_lifetime, approx_liters_note, image_asset_key
      FROM public.breed_reference
      ORDER BY ecm_kg_lifetime DESC
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      breeds: result.rows
    });
  } catch (error) {
    console.error('Error fetching breeds:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/module3/breeds/:breedKey
 * Get a single breed by breed_key
 */
router.get('/breeds/:breedKey', async (req, res) => {
  try {
    const pool = getPool();
    const { breedKey } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM public.breed_reference WHERE breed_key = $1`,
      [breedKey]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Breed '${breedKey}' not found` });
    }
    
    res.json({
      success: true,
      breed: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching breed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module3/simulate
 * Calculate breed scenario with optional overrides
 * Body: { breed_key, overrides: { herd_size, milk_kg_yr, fat_pct, protein_pct, lact_days_avg, lactations_lifetime_avg } }
 */
router.post('/simulate', async (req, res) => {
  try {
    const pool = getPool();
    const { breed_key, overrides = {} } = req.body;
    
    if (!breed_key) {
      return res.status(400).json({ error: 'breed_key is required' });
    }
    
    // Validate overrides
    const validation = validateBreedScenario(overrides);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid overrides', 
        details: validation.errors 
      });
    }
    
    // Get breed reference
    const breedResult = await pool.query(
      `SELECT * FROM public.breed_reference WHERE breed_key = $1`,
      [breed_key]
    );
    
    if (breedResult.rows.length === 0) {
      return res.status(404).json({ error: `Breed '${breed_key}' not found` });
    }
    
    const breedRef = breedResult.rows[0];
    const scenario = buildBreedScenario(breedRef, overrides);
    
    res.json({
      success: true,
      scenario
    });
  } catch (error) {
    console.error('Error simulating breed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module3/compare
 * Compare two breed scenarios
 * Body: { 
 *   a: { breed_key, overrides },
 *   b: { breed_key, overrides }
 * }
 */
router.post('/compare', async (req, res) => {
  try {
    const pool = getPool();
    const { a, b } = req.body;
    
    if (!a?.breed_key || !b?.breed_key) {
      return res.status(400).json({ error: 'Both a.breed_key and b.breed_key are required' });
    }
    
    // Validate overrides for both scenarios
    const validationA = validateBreedScenario(a.overrides || {});
    const validationB = validateBreedScenario(b.overrides || {});
    
    if (!validationA.valid || !validationB.valid) {
      return res.status(400).json({ 
        error: 'Invalid overrides', 
        detailsA: validationA.errors,
        detailsB: validationB.errors
      });
    }
    
    // Get both breed references
    const [breedAResult, breedBResult] = await Promise.all([
      pool.query(`SELECT * FROM public.breed_reference WHERE breed_key = $1`, [a.breed_key]),
      pool.query(`SELECT * FROM public.breed_reference WHERE breed_key = $1`, [b.breed_key])
    ]);
    
    if (breedAResult.rows.length === 0) {
      return res.status(404).json({ error: `Breed '${a.breed_key}' not found` });
    }
    if (breedBResult.rows.length === 0) {
      return res.status(404).json({ error: `Breed '${b.breed_key}' not found` });
    }
    
    const breedA = breedAResult.rows[0];
    const breedB = breedBResult.rows[0];
    
    const scenarioA = buildBreedScenario(breedA, a.overrides || {});
    const scenarioB = buildBreedScenario(breedB, b.overrides || {});
    
    const comparison = compareTwo(scenarioA, scenarioB);
    
    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Error comparing breeds:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module3/rank
 * Rank multiple breed scenarios
 * Body: {
 *   scenarios: [{ breed_key, overrides }, ...],
 *   mode: "per_head" | "total"
 * }
 */
router.post('/rank', async (req, res) => {
  try {
    const pool = getPool();
    const { scenarios = [], mode = 'per_head' } = req.body;
    
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({ error: 'scenarios array is required' });
    }
    
    if (scenarios.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 scenarios allowed' });
    }
    
    // Build all scenarios
    const builtScenarios = [];
    
    for (const scenario of scenarios) {
      if (!scenario.breed_key) {
        return res.status(400).json({ error: 'Each scenario must have breed_key' });
      }
      
      const validation = validateBreedScenario(scenario.overrides || {});
      if (!validation.valid) {
        return res.status(400).json({ 
          error: `Invalid overrides for breed ${scenario.breed_key}`, 
          details: validation.errors 
        });
      }
      
      const breedResult = await pool.query(
        `SELECT * FROM public.breed_reference WHERE breed_key = $1`,
        [scenario.breed_key]
      );
      
      if (breedResult.rows.length === 0) {
        return res.status(404).json({ error: `Breed '${scenario.breed_key}' not found` });
      }
      
      const breedRef = breedResult.rows[0];
      const builtScenario = buildBreedScenario(breedRef, scenario.overrides || {});
      builtScenarios.push(builtScenario);
    }
    
    // Rank scenarios
    const ranked = rankScenarios(builtScenarios, mode);
    
    res.json({
      success: true,
      mode,
      count: ranked.length,
      scenarios: ranked
    });
  } catch (error) {
    console.error('Error ranking breeds:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module3/scenario/:scenarioId/save
 * Save breed scenario to database for a user scenario
 * Body: { breed_key, overrides }
 */
router.post('/scenario/:scenarioId/save', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);
    const { breed_key, overrides = {} } = req.body;
    
    if (!breed_key) {
      return res.status(400).json({ error: 'breed_key is required' });
    }
    
    // Verify scenario ownership
    const scenarioCheck = await pool.query(
      'SELECT id FROM scenarios WHERE id = $1 AND user_id = $2',
      [scenarioId, req.user.userId]
    );
    
    if (scenarioCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }
    
    // Validate overrides
    const validation = validateBreedScenario(overrides);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid overrides', 
        details: validation.errors 
      });
    }
    
    // Get breed reference and calculate
    const breedResult = await pool.query(
      `SELECT * FROM public.breed_reference WHERE breed_key = $1`,
      [breed_key]
    );
    
    if (breedResult.rows.length === 0) {
      return res.status(404).json({ error: `Breed '${breed_key}' not found` });
    }
    
    const breedRef = breedResult.rows[0];
    const calculated = buildBreedScenario(breedRef, overrides);
    
    // Save to database
    const result = await pool.query(
      `
      INSERT INTO public.breed_scenarios (
        scenario_id, breed_key, herd_size,
        milk_kg_yr_override, fat_pct_override, protein_pct_override,
        lact_days_avg_override, lactations_lifetime_avg_override,
        calculated_fat_kg_yr, calculated_protein_kg_yr,
        calculated_ecm_kg_yr, calculated_ecm_kg_lifetime, calculated_ecm_kg_lifetime_total
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (scenario_id, breed_key) DO UPDATE SET
        herd_size = EXCLUDED.herd_size,
        milk_kg_yr_override = EXCLUDED.milk_kg_yr_override,
        fat_pct_override = EXCLUDED.fat_pct_override,
        protein_pct_override = EXCLUDED.protein_pct_override,
        lact_days_avg_override = EXCLUDED.lact_days_avg_override,
        lactations_lifetime_avg_override = EXCLUDED.lactations_lifetime_avg_override,
        calculated_fat_kg_yr = EXCLUDED.calculated_fat_kg_yr,
        calculated_protein_kg_yr = EXCLUDED.calculated_protein_kg_yr,
        calculated_ecm_kg_yr = EXCLUDED.calculated_ecm_kg_yr,
        calculated_ecm_kg_lifetime = EXCLUDED.calculated_ecm_kg_lifetime,
        calculated_ecm_kg_lifetime_total = EXCLUDED.calculated_ecm_kg_lifetime_total,
        updated_at = now()
      RETURNING *
      `,
      [
        scenarioId,
        breed_key,
        overrides.herd_size || 1,
        overrides.milk_kg_yr || null,
        overrides.fat_pct || null,
        overrides.protein_pct || null,
        overrides.lact_days_avg || null,
        overrides.lactations_lifetime_avg || null,
        calculated.fat_kg_yr,
        calculated.protein_kg_yr,
        calculated.ecm_kg_yr,
        calculated.ecm_kg_lifetime,
        calculated.ecm_kg_lifetime_total
      ]
    );
    
    res.json({
      success: true,
      saved: result.rows[0],
      calculated
    });
  } catch (error) {
    console.error('Error saving breed scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/module3/scenario/:scenarioId/load
 * Load saved breed scenarios for a user scenario
 */
router.get('/scenario/:scenarioId/load', async (req, res) => {
  try {
    const pool = getPool();
    const scenarioId = parseInt(req.params.scenarioId);
    
    // Verify scenario ownership
    const scenarioCheck = await pool.query(
      'SELECT id FROM scenarios WHERE id = $1 AND user_id = $2',
      [scenarioId, req.user.userId]
    );
    
    if (scenarioCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Scenario not found or you do not have permission' });
    }
    
    // Load saved breed scenarios
    const result = await pool.query(
      `
      SELECT bs.*, br.breed_name, br.country_or_system, br.approx_liters_note, br.image_asset_key
      FROM public.breed_scenarios bs
      JOIN public.breed_reference br ON bs.breed_key = br.breed_key
      WHERE bs.scenario_id = $1
      ORDER BY bs.updated_at DESC
      `,
      [scenarioId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      scenarios: result.rows
    });
  } catch (error) {
    console.error('Error loading breed scenarios:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
