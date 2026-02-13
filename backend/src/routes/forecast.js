import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { calculateForecast } from '../services/forecastService.js';
import { parseYear } from '../utils/fiscalYear.js';

const router = Router();

router.get('/:farmId/forecast/:year', authenticate, async (req, res, next) => {
  try {
    const { farmId, year } = req.params;
    const fiscalYear = parseYear(year);
    if (!fiscalYear) return res.status(400).json({ error: 'Invalid fiscal year' });
    const forecast = await calculateForecast(farmId, fiscalYear);
    res.json(forecast);
  } catch (err) {
    next(err);
  }
});

export default router;
