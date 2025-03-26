import prisma from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';

export const getOrdersOverTime = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
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
                    analytics[key] = { month: key, orderCount: 0, revenue: 0 };
                }

                analytics[key].orderCount += 1;
                analytics[key].revenue += order.totalAmount;
            });

            const result = Object.values(analytics).sort((a, b) =>
                a.month.localeCompare(b.month)
            );
            res.json(result);
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
            const orderCount = await prisma.order.count();
            const cartCount = await prisma.cart.count();

            const conversionRate =
                cartCount > 0
                    ? ((orderCount / cartCount) * 100).toFixed(2)
                    : '0.00';
            res.json({ conversionRate: `${conversionRate}%` });
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
            res.json(result);
        } catch (error) {
            return next(new ErrorHandler('Error fetching user signups', 500));
        }
    }
);

export const getProductPerformance = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await prisma.software.findMany({
                select: {
                    id: true,
                    name: true,
                    averageRating: true,
                },
            });

            const result = products.map((product) => ({
                id: product.id,
                name: product.name,
                averageRating: product.averageRating || 0,
            }));

            res.json(result);
        } catch (error) {
            return next(
                new ErrorHandler('Error fetching product performance', 500)
            );
        }
    }
);
