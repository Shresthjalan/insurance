import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { leadService } from '../services/LeadService';
import type { Request, Response } from 'express';
import type { LeadSource, LeadStatus } from '../types';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const result = await leadService.list({
    status: req.query.status as LeadStatus | undefined,
    source: req.query.source as LeadSource | undefined,
  }, page, limit);
  res.json({ success: true, request_id: req.requestId, ...result });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadService.findById(req.params.id);
  if (!lead) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: lead });
}));

export { router as leadRoutes };
