import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { AuthError } from '../utils/errors';

export function telenowAuth(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const signature = req.headers['x-telenow-signature'] as string | undefined;

  if (!config.telenow.apiKey) {
    // Not configured — allow in development, reject in production
    if (config.app.env === 'production') throw new AuthError('Telenow auth not configured');
    return next();
  }

  if (apiKey && apiKey === config.telenow.apiKey) return next();

  if (signature && config.telenow.webhookSecret) {
    const body = JSON.stringify(req.body);
    const expected = crypto
      .createHmac('sha256', config.telenow.webhookSecret)
      .update(body)
      .digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return next();
  }

  throw new AuthError('Invalid Telenow credentials');
}

export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
  // Placeholder for internal/CRM API auth (JWT, API key, etc.)
  // For now, skip auth on non-production
  if (config.app.env !== 'production') return next();
  throw new AuthError('Internal API not configured');
}
