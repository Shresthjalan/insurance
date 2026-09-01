import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { quotationRequestService } from '../services/quotation';
import { supabase, unwrap } from '../db';
import type { Quotation } from '../types';
import type { Request, Response } from 'express';

const router = Router();

router.get('/requests/:id', asyncHandler(async (req: Request, res: Response) => {
  const request = await quotationRequestService.findById(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Quotation request not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: request });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const quotation = unwrap<Quotation | null>(
    await supabase.from('quotations').select('*').eq('id', req.params.id).maybeSingle(),
  );
  if (!quotation) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: quotation });
}));

export { router as quotationRoutes };
