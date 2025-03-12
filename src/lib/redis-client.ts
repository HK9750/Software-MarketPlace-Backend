import IORedis from "ioredis";

export const createClient = () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error("REDIS_URL environment variable is not defined");
    }

    return new IORedis(redisUrl,  { maxRetriesPerRequest: null });
};
