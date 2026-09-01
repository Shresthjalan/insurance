import 'dotenv/config';
import { createQuotationWorker } from './quotationWorker';
import { createWhatsAppWorker } from './whatsappWorker';
import { createNotificationWorker } from './notificationWorker';
import { connectDb, disconnectDb } from '../db';
import { logger } from '../utils/logger';

async function start() {
  await connectDb();

  const workers = [
    createQuotationWorker(),
    createWhatsAppWorker(),
    createNotificationWorker(),
  ];

  for (const worker of workers) {
    worker.on('completed', (job) => {
      logger.info('Worker job completed', { queue: worker.name, job_id: job.id });
    });
    worker.on('failed', (job, err) => {
      logger.error('Worker job failed', {
        queue: worker.name,
        job_id: job?.id,
        error: err.message,
      });
    });
  }

  logger.info('All workers started', { count: workers.length });

  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all(workers.map((w) => w.close()));
    await disconnectDb();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Worker startup failed', { error: String(err) });
  process.exit(1);
});
