import { Worker } from 'bullmq';
import prisma from '../lib/prisma';
import { createClient } from '../lib/redis-client';

export const notificationWorker = new Worker(
    'notifications',
    async (job) => {
        const { notificationType, payload } = job.data;

        switch (notificationType) {
            case 'PRICE_DROP': {
                const { productId, oldPrice, newPrice } = payload;
                const wishlists = await prisma.wishlist.findMany({
                    where: { softwareId: productId },
                    select: { userId: true },
                });
                const userIds = wishlists.map((w) => w.userId);
                console.log('User IDS: ', userIds);
                if (userIds.length > 0) {
                    await prisma.notification.createMany({
                        data: userIds.map((userId) => ({
                            userId,
                            softwareId: productId,
                            message: `The price has dropped from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}!`,
                            type: 'PRICE_DROP',
                            isRead: false,
                        })),
                    });
                }
                break;
            }
            case 'ORDER_COMPLETED': {
                break;
            }
            default:
                console.warn(`Unknown notification type: ${notificationType}`);
        }
    },
    { connection: createClient() }
);

notificationWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed.`);
});
notificationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});

notificationWorker.on('ready', () => {
    console.log('Worker is now listening for jobs...');
});
