import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { telenowAuth } from '../middleware/auth';
import { handleTelenowInterest } from '../webhooks/telenow/interest';
import { handleTelenowQuotation } from '../webhooks/telenow/quotation';
import { handleTelenowAdvisor } from '../webhooks/telenow/advisor';
import { handleWhatsAppWebhook } from '../webhooks/whatsapp/handler';
import { metaWhatsAppProvider } from '../providers/whatsapp/MetaWhatsAppProvider';
import type { Request, Response } from 'express';

const router = Router();

// ─── Telenow webhooks ─────────────────────────────────────────────────────────

router.post(
  '/telenow/interest',
  telenowAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await handleTelenowInterest(req.body, req.requestId);
    res.status(200).json({
      success: true,
      request_id: req.requestId,
      event: 'interest_captured',
      lead_id: result.lead_id,
      interest_id: result.interest_id,
    });
  }),
);

router.post(
  '/telenow/quotation',
  telenowAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await handleTelenowQuotation(req.body, req.requestId);
    res.status(200).json({
      success: true,
      request_id: req.requestId,
      event: 'quotation_received',
      quotation_id: result.quotation_request_id,
      quotation_status: result.status,
    });
  }),
);

router.post(
  '/telenow/advisor-call',
  telenowAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await handleTelenowAdvisor(req.body, req.requestId);
    res.status(200).json({
      success: true,
      request_id: req.requestId,
      event: 'advisor_call_requested',
      request_id_appt: result.appointment_id,
      status: result.status,
    });
  }),
);

// ─── WhatsApp webhook ─────────────────────────────────────────────────────────

// GET: webhook challenge verification from Meta
router.get(
  '/whatsapp',
  (req: Request, res: Response) => {
    const challenge = metaWhatsAppProvider.verifyWebhookChallenge(
      req.query as Record<string, string>,
    );
    if (challenge) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  },
);

// POST: inbound events from Meta
router.post(
  '/whatsapp',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    // Respond 200 immediately — WhatsApp requires fast ACK
    res.sendStatus(200);
    // Process asynchronously (errors are caught and logged internally)
    await handleWhatsAppWebhook(req.body, signature);
  }),
);

export { router as webhookRoutes };
