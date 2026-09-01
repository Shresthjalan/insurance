import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { insurancePolicyService } from '../services/InsurancePolicyService';
import type { Request, Response } from 'express';

const router = Router();

const createPolicySchema = z.object({
  insuranceType: z.enum(['car', 'health', 'term', 'life']),
  planType: z.enum(['individual', 'family']),
  amount: z.number().positive(),
  membersCount: z.number().int().positive().optional(),
  customerName: z.string().min(1).optional(),
  phoneNumber: z.string().min(7).optional(),
  customerId: z.string().optional(),
});

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const body = createPolicySchema.parse(req.body);
  const policy = await insurancePolicyService.create(body);
  res.status(201).json({ success: true, request_id: req.requestId, data: policy });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const result = await insurancePolicyService.list(page, limit);
  res.json({ success: true, request_id: req.requestId, ...result });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const policy = await insurancePolicyService.findById(req.params.id);
  if (!policy) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Insurance policy not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: policy });
}));

export { router as insurancePolicyRoutes };
