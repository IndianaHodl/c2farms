import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Placeholder for future crop plan ingestion
router.post('/:farmId/ingest-agronomy', authenticate, async (req, res) => {
  res.json({
    message: 'Agronomy ingestion endpoint placeholder. This will accept crop plan data in a future release.',
    received: req.body,
  });
});

export default router;
