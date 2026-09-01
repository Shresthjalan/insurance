import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { customerService } from '../services/CustomerService';
import type { Request, Response } from 'express';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const result = await customerService.list(page, limit);
  res.json({ success: true, request_id: req.requestId, ...result });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.findById(req.params.id);
  if (!customer) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: customer });
}));

export { router as customerRoutes };
