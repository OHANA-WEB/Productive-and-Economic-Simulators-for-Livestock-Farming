import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import scenarioRoutes from './routes/scenarios.js';
import moduleRoutes from './routes/modules.js';
import breedRoutes from './routes/breeds.js';
import module3Routes from './routes/module3.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes (database will be initialized lazily when needed)
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/breeds', breedRoutes);
app.use('/api/module3', module3Routes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      return res.json({ 
        status: 'ok', 
        message: 'MVP Web API is running',
        database: 'not configured',
        warning: 'DATABASE_URL environment variable is not set'
      });
    }

    // Test database connection
    const pool = createPool();
    if (!pool) {
      return res.json({ 
        status: 'ok', 
        message: 'MVP Web API is running',
        database: 'not configured',
        warning: 'Database pool could not be created'
      });
    }
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      message: 'MVP Web API is running',
      database: 'connected'
    });
  } catch (error) {
    // Don't return 500, just indicate database is disconnected
    res.json({ 
      status: 'ok', 
      message: 'MVP Web API is running',
      database: 'disconnected',
      error: error.message,
      hint: 'Check your DATABASE_URL environment variable in Vercel'
    });
  }
});

// Catch-all for unmatched API routes (for debugging)
app.all('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    path: req.path,
    url: req.url 
  });
});

// Global error handler to prevent function crashes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

// Start server (only in development or when not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless functions
export default app;
