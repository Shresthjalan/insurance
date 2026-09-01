import 'dotenv/config';
import { createApp } from './app';
import { connectDb, disconnectDb } from './db';
import { config } from './config';
import { logger } from './utils/logger';

async function start() {
  await connectDb();

  const app = createApp();
  const server = app.listen(config.app.port, () => {
    logger.info('Insurance Platform API started', {
      port: config.app.port,
      env: config.app.env,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error('Startup failed', { error: String(err) });
  process.exit(1);
});
