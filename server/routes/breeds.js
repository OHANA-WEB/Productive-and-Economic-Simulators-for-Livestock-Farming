import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/breeds
 * Get all available breed profiles
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    
    const result = await pool.query(`
      SELECT 
        id,
        breed_name,
        breed_category,
        avg_daily_peak_liters,
        peak_day,
        total_lactation_liters,
        standard_lactation_days,
        persistence_rate,
        fat_percentage,
        protein_percentage,
        lactose_percentage,
        total_solids_percentage,
        optimal_dry_period_days,
        avg_calving_interval_days,
        region,
        notes
      FROM breed_profiles
      ORDER BY breed_category, total_lactation_liters DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching breeds:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/breeds/:breedName
 * Get detailed information for a specific breed
 */
router.get('/:breedName', async (req, res) => {
  try {
    const pool = getPool();
    const { breedName } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM breed_profiles WHERE breed_name = $1',
      [breedName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Breed not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching breed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/breeds/compare/:breedNames
 * Compare multiple breeds
 * Example: /api/breeds/compare/Holstein,Jersey,Girolando
 */
router.get('/compare/:breedNames', async (req, res) => {
  try {
    const pool = getPool();
    const breedNames = req.params.breedNames.split(',').map(name => name.trim());
    
    if (breedNames.length < 2) {
      return res.status(400).json({ error: 'At least 2 breeds required for comparison' });
    }

    const result = await pool.query(
      `SELECT * FROM breed_profiles WHERE breed_name = ANY($1)
       ORDER BY total_lactation_liters DESC`,
      [breedNames]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No breeds found' });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error comparing breeds:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
