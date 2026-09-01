import { createLogger, format, transports } from 'winston';
import { config } from '../config';

const { combine, timestamp, json, colorize, simple } = format;

export const logger = createLogger({
  level: config.app.logLevel,
  format: config.app.isDev
    ? combine(colorize(), timestamp(), simple())
    : combine(timestamp(), json()),
  transports: [new transports.Console()],
  defaultMeta: { service: 'insurance-platform' },
});

export type LogContext = {
  request_id?: string;
  customer_id?: string;
  lead_id?: string;
  conversation_id?: string;
  insurance_type?: string;
  event_type?: string;
  status?: string;
  duration_ms?: number;
  [key: string]: unknown;
};

export function withContext(ctx: LogContext) {
  return {
    info: (message: string, extra?: LogContext) => logger.info(message, { ...ctx, ...extra }),
    warn: (message: string, extra?: LogContext) => logger.warn(message, { ...ctx, ...extra }),
    error: (message: string, extra?: LogContext) => logger.error(message, { ...ctx, ...extra }),
    debug: (message: string, extra?: LogContext) => logger.debug(message, { ...ctx, ...extra }),
  };
}
