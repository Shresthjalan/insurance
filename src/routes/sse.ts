import { Router } from 'express';
import type { Request, Response } from 'express';
import { dashboardBus } from '../events/DashboardEventBus';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send a keepalive comment every 25 s so proxies don't close the connection
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 25_000);

  const unsubscribe = dashboardBus.subscribe(res);

  req.on('close', () => {
    clearInterval(keepalive);
    unsubscribe();
  });
});

export { router as sseRoutes };
