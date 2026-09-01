import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { advisorService } from '../services/AdvisorService';
import { ValidationError } from '../utils/errors';
import type { Request, Response } from 'express';
import type { AppointmentStatus } from '../types';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const result = await advisorService.list({
    status: req.query.status as AppointmentStatus | undefined,
    date: req.query.date as string | undefined,
  }, page, limit);
  res.json({ success: true, request_id: req.requestId, ...result });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const appt = await advisorService.findById(req.params.id);
  if (!appt) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: appt });
}));

router.post('/:id/assign', asyncHandler(async (req: Request, res: Response) => {
  const { advisor_id } = z.object({ advisor_id: z.string() }).parse(req.body);
  const appt = await advisorService.assign(req.params.id, advisor_id);
  res.json({ success: true, request_id: req.requestId, data: appt });
}));

router.post('/:id/confirm', asyncHandler(async (_req: Request, res: Response) => {
  const appt = await advisorService.updateStatus(_req.params.id, 'confirmed');
  res.json({ success: true, request_id: _req.requestId, data: appt });
}));

router.post('/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const appt = await advisorService.updateStatus(req.params.id, 'cancelled');
  res.json({ success: true, request_id: req.requestId, data: appt });
}));

router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const appt = await advisorService.updateStatus(req.params.id, 'completed');
  res.json({ success: true, request_id: req.requestId, data: appt });
}));

export { router as appointmentRoutes };
