import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { requestId } from './middleware/requestId';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiRoutes } from './routes';
import { config } from './config';

export function createApp() {
  const app = express();

  // ── Trust proxy (required for ngrok / reverse proxies)
  app.set('trust proxy', 1);

  // ── Security headers
  app.use(helmet());

  // ── CORS
  app.use(cors({ origin: config.app.isDev ? '*' : false }));

  // ── Body parsing — raw body preserved for signature verification
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
      limit: '1mb',
    }),
  );

  // ── Request ID
  app.use(requestId);

  // ── HTTP access logging
  app.use(morgan('combined'));

  // ── Rate limiting
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/v1/health',
    }),
  );

  // ── API routes
  app.use('/api/v1', apiRoutes);

  // ── Static — generated PDF quotations
  app.use('/pdfs', express.static(path.resolve(process.cwd(), 'uploads', 'pdfs'), {
    setHeaders: (res) => { res.setHeader('Content-Type', 'application/pdf'); },
  }));

  // ── 404
  app.use(notFound);

  // ── Error handler (must be last)
  app.use(errorHandler);

  return app;
}
