import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import prisma from '../lib/prisma';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';

interface AuthenticatedRequest extends Request {
    user: { id: string };
}

// Create a new subscription plan
export const createSubscriptionPlan = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { name, duration, price, softwareId } = req.body;

        if (!name || !duration || !price || !softwareId) {
            return next(new ErrorHandler('All fields are required', 400));
        }

        const plan = await prisma.subscriptionPlan.create({
            data: { name, duration, price, softwareId },
        });

        res.status(201).json({ success: true, data: plan });
    }
);

// Get all subscription plans
export const getSubscriptionPlans = AsyncErrorHandler(
    async (req: Request, res: Response) => {
        const plans = await prisma.subscriptionPlan.findMany();
        res.status(200).json({ success: true, data: plans });
    }
);

// Get a single subscription plan
export const getSubscriptionPlan = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const planId = req.params.id;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });
        if (!plan)
            return next(new ErrorHandler('Subscription Plan not found', 404));

        res.status(200).json({ success: true, data: plan });
    }
);

// Update a subscription plan
export const updateSubscriptionPlan = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const planId = req.params.id;
        const { name, duration, price } = req.body;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        const plan = await prisma.subscriptionPlan.update({
            where: { id: planId },
            data: { name, duration, price },
        });

        res.status(200).json({ success: true, data: plan });
    }
);

// Delete a subscription plan
export const deleteSubscriptionPlan = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const planId = req.params.id;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        await prisma.subscriptionPlan.delete({ where: { id: planId } });
        res.status(204).json({ success: true, data: null });
    }
);

// Subscribe a user to a plan
export const subscribeToPlan = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { id: userId } = req.user;
        const { planId, autoRenew = true } = req.body;

        if (!planId) {
            return next(new ErrorHandler('Plan ID is required', 400));
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });
        if (!plan)
            return next(new ErrorHandler('Subscription Plan not found', 404));

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration);

        const subscription = await prisma.$transaction(async (tx) => {
            const newSubscription = await tx.subscription.create({
                data: { userId, planId, startDate, endDate, autoRenew },
            });

            await tx.payment.create({
                data: {
                    transactionId: uuid(),
                    userId,
                    amount: plan.price,
                    method: 'SUBSCRIPTION',
                    status: 'COMPLETED',
                    orderId: newSubscription.id,
                },
            });

            return newSubscription;
        });

        res.status(201).json({ success: true, data: subscription });
    }
);

// Get user's active subscription
export const getUserSubscription = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { id: userId } = req.user;

        const subscription = await prisma.subscription.findFirst({
            where: { userId, status: 'ACTIVE' },
            include: { plan: true },
        });

        if (!subscription) {
            return res
                .status(200)
                .json({ success: false, message: 'No active subscription' });
        }

        res.status(200).json({ success: true, data: subscription });
    }
);

// Cancel user subscription
export const cancelSubscription = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { id: userId } = req.user;
        const subscriptionId = req.params.id;

        if (!subscriptionId) {
            return next(new ErrorHandler('Subscription ID is required', 400));
        }

        // Include the related subscription plan to access its price
        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: { plan: true },
        });

        if (!subscription || subscription.userId !== userId) {
            return next(
                new ErrorHandler('Subscription not found or unauthorized', 403)
            );
        }

        if (subscription.status !== 'ACTIVE') {
            return next(
                new ErrorHandler(
                    'Subscription is already canceled or expired',
                    400
                )
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.subscription.update({
                where: { id: subscriptionId },
                data: { status: 'CANCELED', autoRenew: false },
            });

            await tx.payment.create({
                data: {
                    transactionId: uuid(),
                    userId,
                    amount: subscription.plan.price,
                    method: 'REFUND',
                    status: 'COMPLETED',
                    orderId: subscription.id,
                },
            });
        });

        res.status(200).json({
            success: true,
            message: 'Subscription canceled and refund processed',
        });
    }
);
