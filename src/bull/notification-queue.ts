import { Queue } from 'bullmq';
import { createClient } from '../lib/redis-client';

const connection = createClient();

export const notificationQueue = new Queue('notifications', { connection });
export const cleanUpQueue = new Queue('cleanup', { connection });

cleanUpQueue.add('clean-up-old-notifications', {}, { attempts: 3, removeOnFail: true, repeat: { pattern: '0 0 * * *' } });
