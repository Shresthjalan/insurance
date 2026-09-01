import { Router } from 'express';
import { webhookRoutes } from './webhooks';
import { customerRoutes } from './customers';
import { leadRoutes } from './leads';
import { quotationRoutes } from './quotations';
import { conversationRoutes } from './conversations';
import { appointmentRoutes } from './appointments';
import { insurancePolicyRoutes } from './insurancePolicies';

const router = Router();

// Primary external entry points
router.use('/webhooks', webhookRoutes);

// Internal / CRM APIs
router.use('/customers', customerRoutes);
router.use('/leads', leadRoutes);
router.use('/quotations', quotationRoutes);
router.use('/conversations', conversationRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/insurance-policies', insurancePolicyRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as apiRoutes };
