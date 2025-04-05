import prisma from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import { createClient } from '../lib/redis-client';

// Initialize Redis client
const redisClient = createClient();

// Cache keys
const CACHE_KEYS = {
    ORDERS_OVER_TIME: 'analytics:orders-over-time',
    CONVERSION_RATE: 'analytics:conversion-rate',
    USER_SIGNUPS: 'analytics:user-signups',
    PRODUCT_PERFORMANCE: 'analytics:product-performance',
    TRAFFIC_SOURCES: 'analytics:traffic-sources',
    DASHBOARD_SUMMARY: 'analytics:dashboard-summary',
};

// Cache TTL in seconds
const CACHE_TTL = {
    SHORT: 5 * 60, // 5 minutes
    MEDIUM: 30 * 60, // 30 minutes
    LONG: 3 * 60 * 60, // 3 hours
};

/**
 * Helper function to get or set cache
 */
async function getOrSetCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
): Promise<T> {
    try {
        const cachedData = await redisClient.get(key);

        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const freshData = await fetchFn();
        await redisClient.setex(key, ttl, JSON.stringify(freshData));
        return freshData;
    } catch (error) {
        console.error(`Cache operation failed for key ${key}:`, error);
        return fetchFn();
    }
}

export const getOrdersOverTime = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await getOrSetCache(
                CACHE_KEYS.ORDERS_OVER_TIME,
                async () => {
                    const orders = await prisma.order.findMany({
                        select: {
                            createdAt: true,
                            totalAmount: true,
                        },
                    });

                    const analytics: Record<
                        string,
                        { month: string; orderCount: number; revenue: number }
                    > = {};

                    orders.forEach((order) => {
                        const date = new Date(order.createdAt);
                        const key = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;

                        if (!analytics[key]) {
                            analytics[key] = {
                                month: key,
                                orderCount: 0,
                                revenue: 0,
                            };
                        }

                        analytics[key].orderCount += 1;
                        analytics[key].revenue += order.totalAmount;
                    });

                    const result = Object.values(analytics).sort((a, b) =>
                        a.month.localeCompare(b.month)
                    );
                    return result;
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching orders over time', 500)
            );
        }
    }
);

export const getConversionRate = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await getOrSetCache(
                CACHE_KEYS.CONVERSION_RATE,
                async () => {
                    const orderCount = await prisma.order.count();
                    // Updated: Changed cart.count() to cart.count()
                    const cartCount = await prisma.cart.count();

                    const conversionRate =
                        cartCount > 0
                            ? ((orderCount / cartCount) * 100).toFixed(2)
                            : '0.00';
                    return { conversionRate: `${conversionRate}%` };
                },
                CACHE_TTL.SHORT
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching conversion rate', 500)
            );
        }
    }
);

export const getUserSignups = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await getOrSetCache(
                CACHE_KEYS.USER_SIGNUPS,
                async () => {
                    const users = await prisma.user.findMany({
                        select: {
                            createdAt: true,
                        },
                    });

                    const analytics: Record<
                        string,
                        { month: string; signups: number }
                    > = {};

                    users.forEach((user) => {
                        const date = new Date(user.createdAt);
                        const key = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;

                        if (!analytics[key]) {
                            analytics[key] = { month: key, signups: 0 };
                        }

                        analytics[key].signups += 1;
                    });

                    const result = Object.values(analytics).sort((a, b) =>
                        a.month.localeCompare(b.month)
                    );
                    return result;
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(new ErrorHandler('Error fetching user signups', 500));
        }
    }
);

export const getProductPerformance = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await getOrSetCache(
                CACHE_KEYS.PRODUCT_PERFORMANCE,
                async () => {
                    // Updated: Changed to match the schema's structure
                    const products = await prisma.software.findMany({
                        select: {
                            id: true,
                            name: true,
                            averageRating: true,
                            subscriptions: {
                                select: {
                                    orderItems: {
                                        select: {
                                            id: true,
                                        },
                                    },
                                },
                            },
                        },
                    });

                    const result = products.map((product) => {
                        // Count all order items across all subscription plans
                        const orderCount = product.subscriptions.reduce(
                            (total, subscription) =>
                                total + subscription.orderItems.length,
                            0
                        );

                        return {
                            id: product.id,
                            name: product.name,
                            averageRating: product.averageRating || 0,
                            orderCount: orderCount,
                        };
                    });

                    // Sort by order count descending
                    return result.sort((a, b) => b.orderCount - a.orderCount);
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching product performance', 500)
            );
        }
    }
);

export const getDashboardSummary = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await getOrSetCache(
                CACHE_KEYS.DASHBOARD_SUMMARY,
                async () => {
                    const totalOrders = await prisma.order.count();
                    const totalRevenue = await prisma.order.aggregate({
                        _sum: {
                            totalAmount: true,
                        },
                    });
                    const totalUsers = await prisma.user.count();
                    // Updated: Changed to match the schema's "Software" model
                    const totalProducts = await prisma.software.count();

                    // Get current month stats
                    const now = new Date();
                    const firstDayOfMonth = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1
                    );

                    const monthlyOrders = await prisma.order.count({
                        where: {
                            createdAt: {
                                gte: firstDayOfMonth,
                            },
                        },
                    });

                    const monthlyRevenue = await prisma.order.aggregate({
                        _sum: {
                            totalAmount: true,
                        },
                        where: {
                            createdAt: {
                                gte: firstDayOfMonth,
                            },
                        },
                    });

                    return {
                        totalOrders,
                        totalRevenue: totalRevenue._sum.totalAmount || 0,
                        totalUsers,
                        totalProducts,
                        monthlyOrders,
                        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
                    };
                },
                CACHE_TTL.SHORT
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching dashboard summary', 500)
            );
        }
    }
);

// Invalidate all analytics cache
export const invalidateAnalyticsCache = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const keys = await redisClient.keys('analytics:*');
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            res.json({ success: true, message: 'Analytics cache invalidated' });
        } catch (error) {
            return next(new ErrorHandler('Error invalidating cache', 500));
        }
    }
);
