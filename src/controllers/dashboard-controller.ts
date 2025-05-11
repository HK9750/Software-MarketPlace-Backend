import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import { createClient } from '../lib/redis-client';

const redis = createClient();
const CACHE_TTL = 60 * 15; // 15 minutes cache

export const getDashboardStats = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            return next(new ErrorHandler('Unauthorized access', 403));
        }

        const cacheKey = `dashboard:stats:${user.id}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData),
                source: 'cache',
            });
        }

        const totalUsers = await prisma.user.count();

        const usersByRole = {
            CUSTOMER: await prisma.user.count({ where: { role: 'CUSTOMER' } }),
            SELLER: await prisma.user.count({ where: { role: 'SELLER' } }),
            ADMIN: await prisma.user.count({ where: { role: 'ADMIN' } }),
        };

        const totalSoftware = await prisma.software.count();

        const pendingOrders = await prisma.order.count({
            where: { status: 'PENDING' },
        });

        const payments = await prisma.payment.findMany({
            where: { status: 'COMPLETED' },
        });
        const totalRevenue = payments.reduce(
            (sum, payment) => sum + payment.amount,
            0
        );

        const recentSales = await prisma.order.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                items: {
                    include: {
                        subscription: {
                            include: {
                                software: true,
                            },
                        },
                    },
                },
            },
        });

        const formattedRecentSales = recentSales.map((order) => {
            const firstItem = order.items[0];
            return {
                id: order.id,
                user: {
                    name: order.user.profile
                        ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
                        : order.user.username,
                    email: order.user.email,
                },
                amount: order.totalAmount,
                status: order.status,
                date: order.createdAt,
                softwareName:
                    firstItem?.subscription?.software?.name ||
                    'Unknown Software',
            };
        });

        const recentSoftware = await prisma.software.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                category: true,
                seller: {
                    include: {
                        user: true,
                    },
                },
                subscriptions: {
                    where: {
                        status: 'ACTIVE',
                    },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        const formattedRecentSoftware = recentSoftware.map((software) => {
            const latestSubscription = software.subscriptions[0];
            return {
                id: software.id,
                name: software.name,
                seller: software.seller,
                status: software.status,
                price: latestSubscription?.price || 0,
                createdAt: software.createdAt,
                categoryId: software.categoryId,
                category: software.category,
            };
        });

        const sellers = await prisma.sellerProfile.findMany({
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                softwareProducts: {
                    include: {
                        subscriptions: {
                            where: {
                                status: 'ACTIVE',
                            },
                            include: {
                                orderItems: {
                                    include: {
                                        order: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const sellerSales = sellers.map((seller) => {
            let totalSales = 0;

            seller.softwareProducts.forEach((software) => {
                software.subscriptions.forEach((subscription) => {
                    subscription.orderItems.forEach((item) => {
                        if (item.order.status === 'COMPLETED') {
                            totalSales += item.price;
                        }
                    });
                });
            });

            return {
                id: seller.id,
                name: seller.user.profile
                    ? `${seller.user.profile.firstName} ${seller.user.profile.lastName}`
                    : seller.user.username,
                username: seller.user.username,
                totalSales,
            };
        });

        const topSellers = sellerSales
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 5);

        const totalSellersSales = topSellers.reduce(
            (sum, seller) => sum + seller.totalSales,
            0
        );
        const topSellersWithPercentage = topSellers.map((seller) => ({
            ...seller,
            salesPercentage: totalSellersSales
                ? Math.round((seller.totalSales / totalSellersSales) * 100)
                : 0,
        }));

        const today = new Date();
        const monthlySales = [];

        for (let i = 5; i >= 0; i--) {
            const month = new Date(
                today.getFullYear(),
                today.getMonth() - i,
                1
            );
            const nextMonth = new Date(
                month.getFullYear(),
                month.getMonth() + 1,
                1
            );

            const monthOrders = await prisma.order.findMany({
                where: {
                    status: 'COMPLETED',
                    createdAt: {
                        gte: month,
                        lt: nextMonth,
                    },
                },
            });

            const monthTotal = monthOrders.reduce(
                (sum, order) => sum + order.totalAmount,
                0
            );

            monthlySales.push({
                month: month.toLocaleString('default', { month: 'short' }),
                sales: monthTotal,
            });
        }

        const subscriptionStats = {
            ACTIVE: await prisma.orderItem.count({
                where: { status: 'ACTIVE' },
            }),
            CANCELED: await prisma.orderItem.count({
                where: { status: 'CANCELED' },
            }),
            EXPIRED: await prisma.orderItem.count({
                where: { status: 'EXPIRED' },
            }),
            PAUSED: await prisma.orderItem.count({
                where: { status: 'PAUSED' },
            }),
        };

        const responseData = {
            totalUsers,
            usersByRole,
            totalSoftware,
            totalRevenue,
            pendingOrders,
            recentSales: formattedRecentSales,
            recentSoftware: formattedRecentSoftware,
            topSellers: topSellersWithPercentage,
            monthlySales,
            subscriptionStats,
        };

        await redis.set(
            cacheKey,
            JSON.stringify(responseData),
            'EX',
            CACHE_TTL
        );

        res.status(200).json({
            success: true,
            data: responseData,
            source: 'db',
        });
    }
);

export const getSoftwareStats = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            return next(new ErrorHandler('Unauthorized access', 403));
        }

        const cacheKey = `software:stats:${user.id}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData),
                source: 'cache',
            });
        }

        const softwareByStatus = {
            PENDING: await prisma.software.count({ where: { status: 0 } }),
            ACTIVE: await prisma.software.count({ where: { status: 1 } }),
            INACTIVE: await prisma.software.count({ where: { status: 2 } }),
        };

        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        software: true,
                    },
                },
            },
        });

        const softwareByCategory = categories.map((category) => ({
            categoryName: category.name,
            count: category._count.software,
        }));

        const topRatedSoftware = await prisma.software.findMany({
            where: { status: 1 },
            orderBy: { averageRating: 'desc' },
            take: 5,
            include: {
                category: true,
                seller: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        const responseData = {
            softwareByStatus,
            softwareByCategory,
            topRatedSoftware,
        };

        await redis.set(
            cacheKey,
            JSON.stringify(responseData),
            'EX',
            CACHE_TTL
        );

        res.status(200).json({
            success: true,
            data: responseData,
            source: 'db',
        });
    }
);

export const getUserStats = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            return next(new ErrorHandler('Unauthorized access', 403));
        }

        const cacheKey = `user:stats:${user.id}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData),
                source: 'cache',
            });
        }

        const today = new Date();
        const registrationStats = [];

        for (let i = 5; i >= 0; i--) {
            const month = new Date(
                today.getFullYear(),
                today.getMonth() - i,
                1
            );
            const nextMonth = new Date(
                month.getFullYear(),
                month.getMonth() + 1,
                1
            );

            const newUsers = await prisma.user.count({
                where: {
                    createdAt: {
                        gte: month,
                        lt: nextMonth,
                    },
                },
            });

            registrationStats.push({
                month: month.toLocaleString('default', { month: 'short' }),
                count: newUsers,
            });
        }

        const recentUsers = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                profile: true,
            },
        });

        const formattedRecentUsers = recentUsers.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            name: user.profile
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user.username,
            createdAt: user.createdAt,
        }));

        const usersWithOrderCounts = await prisma.user.findMany({
            include: {
                _count: {
                    select: {
                        orders: true,
                    },
                },
                profile: true,
            },
        });

        const mostActiveUsers = usersWithOrderCounts
            .sort((a, b) => b._count.orders - a._count.orders)
            .slice(0, 5)
            .map((user) => ({
                id: user.id,
                username: user.username,
                name: user.profile
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user.username,
                orderCount: user._count.orders,
            }));

        const responseData = {
            registrationStats,
            recentUsers: formattedRecentUsers,
            mostActiveUsers,
        };

        await redis.set(
            cacheKey,
            JSON.stringify(responseData),
            'EX',
            CACHE_TTL
        );

        res.status(200).json({
            success: true,
            data: responseData,
            source: 'db',
        });
    }
);

export const getOrderStats = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            return next(new ErrorHandler('Unauthorized access', 403));
        }

        const cacheKey = `order:stats:${user.id}`;
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.status(200).json({
                success: true,
                data: JSON.parse(cachedData),
                source: 'cache',
            });
        }

        const ordersByStatus = {
            PENDING: await prisma.order.count({ where: { status: 'PENDING' } }),
            COMPLETED: await prisma.order.count({
                where: { status: 'COMPLETED' },
            }),
            CANCELLED: await prisma.order.count({
                where: { status: 'CANCELLED' },
            }),
            REFUNDED: await prisma.order.count({
                where: { status: 'REFUNDED' },
            }),
        };

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const upcomingRenewals = await prisma.licenseKey.count({
            where: {
                validUntil: {
                    gte: new Date(),
                    lte: sevenDaysFromNow,
                },
                isActive: true,
            },
        });

        const recentOrders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                items: {
                    include: {
                        subscription: {
                            include: {
                                software: true,
                            },
                        },
                    },
                },
            },
        });

        const formattedRecentOrders = recentOrders.map((order) => ({
            id: order.id,
            customerName: order.user.profile
                ? `${order.user.profile.firstName} ${order.user.profile.lastName}`
                : order.user.username,
            amount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
            items: order.items.map((item) => ({
                software: item.subscription?.software?.name || 'Unknown',
                price: item.price,
            })),
        }));

        const responseData = {
            ordersByStatus,
            upcomingRenewals,
            recentOrders: formattedRecentOrders,
        };

        await redis.set(
            cacheKey,
            JSON.stringify(responseData),
            'EX',
            CACHE_TTL
        );

        res.status(200).json({
            success: true,
            data: responseData,
            source: 'db',
        });
    }
);

// Cache invalidation methods
export const invalidateDashboardCache = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not found', 404));
        }

        const keys = [
            `dashboard:stats:${userId}`,
            `software:stats:${userId}`,
            `user:stats:${userId}`,
            `order:stats:${userId}`,
        ];

        await Promise.all(keys.map((key) => redis.del(key)));

        res.status(200).json({
            success: true,
            message: 'Dashboard cache invalidated',
        });
    }
);
