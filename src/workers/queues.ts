import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';

const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
});

const defaultJobOptions: QueueOptions['defaultJobOptions'] = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 500 },
};

export const quotationQueue = new Queue('quotation_jobs', {
  connection: redisConnection,
  defaultJobOptions,
});

export const documentQueue = new Queue('document_jobs', {
  connection: redisConnection,
  defaultJobOptions,
});

export const whatsappQueue = new Queue('whatsapp_jobs', {
  connection: redisConnection,
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});

export const notificationQueue = new Queue('notification_jobs', {
  connection: redisConnection,
  defaultJobOptions,
});

export const appointmentQueue = new Queue('appointment_jobs', {
  connection: redisConnection,
  defaultJobOptions,
});

export { redisConnection };
