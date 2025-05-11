import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import prisma from '../lib/prisma';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';

export interface AuthenticatedRequest extends Request {
    user: { id: string; role: string };
}

export const createSubscriptionPlan = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { name, duration } = req.body;

        if (!name || !duration) {
            return next(new ErrorHandler('All fields are required', 400));
        }

        const plan = await prisma.subscriptionPlan.create({
            data: { name, duration },
        });

        res.status(201).json({ success: true, data: plan });
    }
);

export const getSubscriptionPlans = AsyncErrorHandler(
    async (req: Request, res: Response) => {
        const plans = await prisma.subscriptionPlan.findMany();
        res.status(200).json({ success: true, data: plans });
    }
);

export const getSubscriptionPlanById = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const planId = req.params.id;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            return next(new ErrorHandler('Plan not found', 404));
        }

        res.status(200).json({ success: true, data: plan });
    }
);

export const deleteSubscriptionPlan = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const planId = req.params.id;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        const plan = await prisma.subscriptionPlan.delete({
            where: { id: planId },
        });

        res.status(200).json({ success: true, data: plan });
    }
);

export const updateSubscriptionPlan = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const planId = req.params.id;
        const { name, duration } = req.body;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        const plan = await prisma.subscriptionPlan.update({
            where: { id: planId },
            data: { name, duration },
        });

        res.status(200).json({ success: true, data: plan });
    }
);

export const getMySubscriptions = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ErrorHandler('Unauthorized', 401));
        }

        const userId = req.user.id;

        const subscriptions = await prisma.licenseKey.findMany({
            where: { userId },
            select: {
                id: true,
                key: true,
                createdAt: true,
                validUntil: true,
                isActive: true,
                subscription: {
                    select: {
                        price: true,
                        status: true,
                        subscriptionPlan: {
                            select: {
                                name: true,
                                duration: true,
                            },
                        },
                        software: {
                            select: {
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        const filteredSubscriptions = subscriptions.filter(
            (license) =>
                license.subscription && license.subscription.status === 'ACTIVE'
        );

        res.status(200).json({
            success: true,
            filteredSubscriptions,
        });
    }
);
