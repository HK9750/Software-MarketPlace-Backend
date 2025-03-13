import IORedis from 'ioredis';
import config from '../config';

export const createClient = () => {
    const redisUrl = config.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not defined');
    }

    return new IORedis(redisUrl, { maxRetriesPerRequest: null });
};
