import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { conversationService } from '../services/conversation/ConversationService';
import type { Request, Response } from 'express';

const router = Router();

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const conv = await conversationService.findById(req.params.id);
  if (!conv) {
    res.status(404).json({ success: false, request_id: req.requestId, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    return;
  }
  res.json({ success: true, request_id: req.requestId, data: conv });
}));

router.get('/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const messages = await conversationService.getMessages(req.params.id, limit);
  res.json({ success: true, request_id: req.requestId, data: messages });
}));

export { router as conversationRoutes };
