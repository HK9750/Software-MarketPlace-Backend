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

// Cache keys for seller analytics
const SELLER_CACHE_KEYS = {
    SELLER_PRODUCTS: 'analytics:seller:products:',
    SELLER_REVENUE: 'analytics:seller:revenue:',
    SELLER_SALES_OVER_TIME: 'analytics:seller:sales-over-time:',
    SELLER_CONVERSIONS: 'analytics:seller:conversions:',
    SELLER_TOP_PERFORMING: 'analytics:seller:top-performing:',
    SELLER_DASHBOARD_SUMMARY: 'analytics:seller:dashboard-summary:',
};

/**
 * Get all products for a seller with performance metrics
 */
export const getSellerProducts = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const cacheKey = `${SELLER_CACHE_KEYS.SELLER_PRODUCTS}${sellerId}`;

            const data = await getOrSetCache(
                cacheKey,
                async () => {
                    const products = await prisma.software.findMany({
                        where: {
                            sellerId: sellerId,
                        },
                        select: {
                            id: true,
                            name: true,
                            averageRating: true,
                            status: true,
                            createdAt: true,
                            subscriptions: {
                                select: {
                                    price: true,
                                    orderItems: {
                                        select: {
                                            id: true,
                                        },
                                    },
                                },
                            },
                            reviews: {
                                select: {
                                    rating: true,
                                },
                                where: {
                                    isDeleted: false,
                                },
                            },
                        },
                    });

                    return products.map((product) => {
                        // Count all order items across all subscription plans
                        const salesCount = product.subscriptions.reduce(
                            (total, subscription) =>
                                total + subscription.orderItems.length,
                            0
                        );

                        // Calculate total revenue from all subscriptions
                        const totalRevenue = product.subscriptions.reduce(
                            (total, subscription) =>
                                total +
                                subscription.price *
                                    subscription.orderItems.length,
                            0
                        );

                        // Get review count
                        const reviewCount = product.reviews.length;

                        return {
                            id: product.id,
                            name: product.name,
                            status:
                                product.status === 1
                                    ? 'Active'
                                    : product.status === 0
                                      ? 'Pending'
                                      : 'Inactive',
                            averageRating: product.averageRating || 0,
                            reviewCount,
                            salesCount,
                            totalRevenue,
                            launchDate: product.createdAt,
                        };
                    });
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching seller products', 500)
            );
        }
    }
);

/**
 * Get seller revenue over time (monthly breakdown)
 */
export const getSellerRevenueOverTime = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const cacheKey = `${SELLER_CACHE_KEYS.SELLER_REVENUE}${sellerId}`;

            const data = await getOrSetCache(
                cacheKey,
                async () => {
                    // Get all software products for this seller
                    const sellerProducts = await prisma.software.findMany({
                        where: {
                            sellerId: sellerId,
                        },
                        select: {
                            id: true,
                        },
                    });

                    const productIds = sellerProducts.map(
                        (product) => product.id
                    );

                    // Get all subscription plans for these products
                    const subscriptionPlans =
                        await prisma.softwareSubscriptionPlan.findMany({
                            where: {
                                softwareId: {
                                    in: productIds,
                                },
                            },
                            select: {
                                id: true,
                            },
                        });

                    const subscriptionIds = subscriptionPlans.map(
                        (plan) => plan.id
                    );

                    // Find all order items for these subscription plans
                    const orderItems = await prisma.orderItem.findMany({
                        where: {
                            subscriptionId: {
                                in: subscriptionIds,
                            },
                        },
                        select: {
                            price: true,
                            order: {
                                select: {
                                    createdAt: true,
                                },
                            },
                        },
                    });

                    // Group by month and calculate revenue
                    const monthlyRevenue: Record<
                        string,
                        { month: string; revenue: number; orderCount: number }
                    > = {};

                    orderItems.forEach((item) => {
                        const date = new Date(item.order.createdAt);
                        const key = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;

                        if (!monthlyRevenue[key]) {
                            monthlyRevenue[key] = {
                                month: key,
                                revenue: 0,
                                orderCount: 0,
                            };
                        }

                        monthlyRevenue[key].revenue += item.price;
                        monthlyRevenue[key].orderCount += 1;
                    });

                    return Object.values(monthlyRevenue).sort((a, b) =>
                        a.month.localeCompare(b.month)
                    );
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching seller revenue data', 500)
            );
        }
    }
);

/**
 * Get seller's product sales over time
 */
export const getSellerSalesOverTime = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;
        const productId = req.query.productId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const cacheKey = `${SELLER_CACHE_KEYS.SELLER_SALES_OVER_TIME}${sellerId}${productId ? `:${productId}` : ''}`;

            const data = await getOrSetCache(
                cacheKey,
                async () => {
                    // Base query to find the seller's products
                    const baseProductQuery = {
                        sellerId: sellerId,
                    };

                    // Add product ID if specified
                    if (productId) {
                        Object.assign(baseProductQuery, { id: productId });
                    }

                    // Get all relevant products
                    const products = await prisma.software.findMany({
                        where: baseProductQuery,
                        select: {
                            id: true,
                            name: true,
                            subscriptions: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    });

                    // Get all subscription IDs
                    const subscriptionIds = products.flatMap((product) =>
                        product.subscriptions.map((sub) => sub.id)
                    );

                    // Find all order items for these subscriptions
                    const orderItems = await prisma.orderItem.findMany({
                        where: {
                            subscriptionId: {
                                in: subscriptionIds,
                            },
                        },
                        select: {
                            subscriptionId: true,
                            order: {
                                select: {
                                    createdAt: true,
                                },
                            },
                        },
                    });

                    // Build a map of subscription ID to product name for reference
                    const subscriptionToProductMap = new Map();
                    products.forEach((product) => {
                        product.subscriptions.forEach((sub) => {
                            subscriptionToProductMap.set(sub.id, {
                                productId: product.id,
                                productName: product.name,
                            });
                        });
                    });

                    // Group data by month and product
                    const result: Record<
                        string,
                        Record<string, { sales: number }>
                    > = {};

                    orderItems.forEach((item) => {
                        const date = new Date(item.order.createdAt);
                        const month = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;

                        const productInfo = subscriptionToProductMap.get(
                            item.subscriptionId
                        );
                        if (!productInfo) return;

                        const { productId, productName } = productInfo;

                        if (!result[month]) {
                            result[month] = {};
                        }

                        if (!result[month][productName]) {
                            result[month][productName] = { sales: 0 };
                        }

                        result[month][productName].sales += 1;
                    });

                    // Format the result for charting
                    const formattedResult = Object.entries(result)
                        .map(([month, products]) => {
                            return {
                                month,
                                ...Object.fromEntries(
                                    Object.entries(products).map(
                                        ([productName, data]) => [
                                            productName,
                                            data.sales,
                                        ]
                                    )
                                ),
                            };
                        })
                        .sort((a, b) => a.month.localeCompare(b.month));

                    return formattedResult;
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching seller sales data', 500)
            );
        }
    }
);

/**
 * Get product conversion rate (views to purchases) for seller products
 */
export const getSellerConversionRates = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const cacheKey = `${SELLER_CACHE_KEYS.SELLER_CONVERSIONS}${sellerId}`;

            const data = await getOrSetCache(
                cacheKey,
                async () => {
                    // Get all software products for this seller
                    const products = await prisma.software.findMany({
                        where: {
                            sellerId: sellerId,
                        },
                        select: {
                            id: true,
                            name: true,
                            subscriptions: {
                                select: {
                                    id: true,
                                    orderItems: {
                                        select: {
                                            id: true,
                                        },
                                    },
                                },
                            },
                        },
                    });

                    // For each product, get the cart items (potential conversions)
                    const conversionData = await Promise.all(
                        products.map(async (product) => {
                            const subscriptionIds = product.subscriptions.map(
                                (sub) => sub.id
                            );

                            // Count carts with these subscription IDs (potential conversions)
                            const cartCount = await prisma.cart.count({
                                where: {
                                    subscriptionId: {
                                        in: subscriptionIds,
                                    },
                                },
                            });

                            // Count actual purchases
                            const purchaseCount = product.subscriptions.reduce(
                                (total, sub) => total + sub.orderItems.length,
                                0
                            );

                            // Calculate conversion rate
                            const conversionRate =
                                cartCount > 0
                                    ? (
                                          (purchaseCount / cartCount) *
                                          100
                                      ).toFixed(2)
                                    : '0.00';

                            return {
                                productId: product.id,
                                productName: product.name,
                                cartCount,
                                purchaseCount,
                                conversionRate: `${conversionRate}%`,
                            };
                        })
                    );

                    return conversionData;
                },
                CACHE_TTL.SHORT
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching seller conversion rates', 500)
            );
        }
    }
);

/**
 * Get seller's top performing products
 */
export const getSellerTopPerforming = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const cacheKey = `${SELLER_CACHE_KEYS.SELLER_TOP_PERFORMING}${sellerId}`;

            const data = await getOrSetCache(
                cacheKey,
                async () => {
                    const products = await prisma.software.findMany({
                        where: {
                            sellerId: sellerId,
                        },
                        select: {
                            id: true,
                            name: true,
                            averageRating: true,
                            subscriptions: {
                                select: {
                                    price: true,
                                    orderItems: {
                                        select: {
                                            id: true,
                                        },
                                    },
                                },
                            },
                            reviews: {
                                select: {
                                    rating: true,
                                    comment: true,
                                    createdAt: true,
                                    user: {
                                        select: {
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    isDeleted: false,
                                },
                                orderBy: {
                                    createdAt: 'desc',
                                },
                                take: 3, // Get only recent reviews
                            },
                        },
                    });

                    // Calculate performance metrics and add recent reviews
                    const withMetrics = products.map((product) => {
                        // Count all sales across subscription plans
                        const salesCount = product.subscriptions.reduce(
                            (total, subscription) =>
                                total + subscription.orderItems.length,
                            0
                        );

                        // Calculate total revenue
                        const revenue = product.subscriptions.reduce(
                            (total, subscription) =>
                                total +
                                subscription.price *
                                    subscription.orderItems.length,
                            0
                        );

                        // Format recent reviews
                        const recentReviews = product.reviews.map((review) => ({
                            rating: review.rating,
                            comment: review.comment,
                            username: review.user.username,
                            date: review.createdAt,
                        }));

                        return {
                            id: product.id,
                            name: product.name,
                            averageRating: product.averageRating || 0,
                            salesCount,
                            revenue,
                            recentReviews,
                        };
                    });

                    // Sort by revenue (highest first)
                    return withMetrics.sort((a, b) => b.revenue - a.revenue);
                },
                CACHE_TTL.MEDIUM
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching top performing products', 500)
            );
        }
    }
);

/**
 * Get seller dashboard summary
 */
export const getSellerDashboardSummary = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const cacheKey = `${SELLER_CACHE_KEYS.SELLER_DASHBOARD_SUMMARY}${sellerId}`;

            const data = await getOrSetCache(
                cacheKey,
                async () => {
                    // Get all products for this seller
                    const products = await prisma.software.findMany({
                        where: {
                            sellerId: sellerId,
                        },
                        select: {
                            id: true,
                            subscriptions: {
                                select: {
                                    id: true,
                                    price: true,
                                },
                            },
                        },
                    });

                    // Get all subscription IDs for these products
                    const subscriptionIds = products.flatMap((product) =>
                        product.subscriptions.map((sub) => sub.id)
                    );

                    // Find all order items for these subscriptions
                    const orderItems = await prisma.orderItem.findMany({
                        where: {
                            subscriptionId: {
                                in: subscriptionIds,
                            },
                        },
                        select: {
                            price: true,
                            order: {
                                select: {
                                    createdAt: true,
                                },
                            },
                        },
                    });

                    // Calculate total products, total sales, and total revenue
                    const totalProducts = products.length;
                    const totalSales = orderItems.length;
                    const totalRevenue = orderItems.reduce(
                        (sum, item) => sum + item.price,
                        0
                    );

                    // Calculate current month metrics
                    const now = new Date();
                    const firstDayOfMonth = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1
                    );

                    const monthlySales = orderItems.filter(
                        (item) =>
                            new Date(item.order.createdAt) >= firstDayOfMonth
                    ).length;

                    const monthlyRevenue = orderItems
                        .filter(
                            (item) =>
                                new Date(item.order.createdAt) >=
                                firstDayOfMonth
                        )
                        .reduce((sum, item) => sum + item.price, 0);

                    // Get all reviews for seller products
                    const reviews = await prisma.review.count({
                        where: {
                            softwareId: {
                                in: products.map((p) => p.id),
                            },
                            isDeleted: false,
                        },
                    });

                    // Calculate avg. revenue per product
                    const avgRevenuePerProduct =
                        totalProducts > 0 ? totalRevenue / totalProducts : 0;

                    return {
                        totalProducts,
                        totalSales,
                        totalRevenue,
                        monthlySales,
                        monthlyRevenue,
                        totalReviews: reviews,
                        avgRevenuePerProduct: parseFloat(
                            avgRevenuePerProduct.toFixed(2)
                        ),
                    };
                },
                CACHE_TTL.SHORT
            );

            res.json(data);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching seller dashboard summary', 500)
            );
        }
    }
);

/**
 * Invalidate seller analytics cache for a specific seller
 */
export const invalidateSellerAnalyticsCache = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const sellerId = req.query.sellerId as string;

        if (!sellerId) {
            return next(new ErrorHandler('Seller ID is required', 400));
        }

        try {
            const keys = await redisClient.keys(
                `analytics:seller:*:${sellerId}*`
            );
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            res.json({
                success: true,
                message: `Analytics cache invalidated for seller ID: ${sellerId}`,
            });
        } catch (error) {
            return next(
                new ErrorHandler('Error invalidating seller cache', 500)
            );
        }
    }
);
