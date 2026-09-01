import type { Request, Response, NextFunction } from 'express';
import { ulid } from 'ulid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestId(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = `REQ-${ulid()}`;
  req.startTime = Date.now();
  next();
}
