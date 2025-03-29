import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import prisma from '../lib/prisma';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';

interface AuthenticatedRequest extends Request {
    user: { id: string };
}

export const createOrder = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user.id;
        const { orderItems } = req.body;

        if (!orderItems || !orderItems.length) {
            return next(new ErrorHandler('No order items provided', 400));
        }

        const subscriptionIds = orderItems.map(
            (item: any) => item.subscriptionId
        );

        const subscriptions = await prisma.softwareSubscriptionPlan.findMany({
            where: { id: { in: subscriptionIds } },
            select: {
                id: true,
                price: true,
                subscriptionPlan: {
                    select: {
                        duration: true,
                    },
                },
            },
        });

        if (subscriptions.length !== orderItems.length) {
            return next(
                new ErrorHandler('Invalid subscriptions in order', 400)
            );
        }

        const totalAmount = subscriptions.reduce(
            (sum, sub) => sum + sub.price,
            0
        );

        const orderData = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    userId,
                    totalAmount,
                    status: 'PENDING',
                },
            });

            const orderItemsData = subscriptions.map((sub) => ({
                orderId: order.id,
                subscriptionId: sub.id,
                price: sub.price,
            }));

            await tx.orderItem.createMany({ data: orderItemsData });

            const licenseKeysData = subscriptions.map((sub) => ({
                key: crypto.randomUUID(),
                softwareSubscriptionId: sub.id,
                userId,
                validUntil: new Date(
                    new Date().setMonth(
                        new Date().getMonth() + sub.subscriptionPlan.duration
                    )
                ),
            }));

            await tx.licenseKey.createMany({ data: licenseKeysData });

            return order;
        });

        res.status(201).json({ success: true, order: orderData });
    }
);

export const getAllOrders = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orders = await prisma.order.findMany({
                include: { items: true },
            });
            res.status(200).json({ success: true, data: orders });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// export const getUserOrderHistory = AsyncErrorHandler(
//     async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//         const { id: userId } = req.params;
//         if (!userId) {
//             return next(new ErrorHandler('User ID is required', 400));
//         }
//         const orders = await prisma.userOrderHistory.findMany({
//             where: { userId },
//             include: { order: { include: { items: true } } },
//         });
//         res.status(200).json({ success: true, data: orders });
//     }
// );

// export const getOrder = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         const order = await prisma.order.findUnique({
//             where: { id: orderId },
//             include: { items: true },
//         });
//         if (!order) return next(new ErrorHandler('Order not found', 404));
//         res.status(200).json({ success: true, data: order });
//     }
// );

// export const updateOrderStatus = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         const { status } = req.body;
//         if (!status) {
//             return next(new ErrorHandler('Status is required', 400));
//         }
//         const order = await prisma.order.update({
//             where: { id: orderId },
//             data: { status },
//         });
//         res.status(200).json({ success: true, data: order });
//     }
// );

export const deleteOrder = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const orderId = req.params.id;
        if (!orderId) {
            return next(new ErrorHandler('Order ID is required', 400));
        }
        await prisma.order.delete({ where: { id: orderId } });
        res.status(204).json({ success: true, data: null });
    }
);

export const getOrder = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const orderId = req.params.id;
        if (!orderId) {
            return next(new ErrorHandler('Order ID is required', 400));
        }
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order) return next(new ErrorHandler('Order not found', 404));
        res.status(200).json({ success: true, data: order });
    }
);

// export const cancelOrderWithRefund = AsyncErrorHandler(
//     async (req: Request, res: Response, next: NextFunction) => {
//         const orderId = req.params.id;
//         if (!orderId) {
//             return next(new ErrorHandler('Order ID is required', 400));
//         }
//         const result = await prisma.$transaction(async (tx) => {
//             const order = await tx.order.update({
//                 where: { id: orderId },
//                 data: { status: 'CANCELLED' },
//                 include: { items: true },
//             });
//             if (order.items.length) {
//                 await tx.licenseKey.updateMany({
//                     where: {
//                         orderItemId: { in: order.items.map((i) => i.id) },
//                     },
//                     data: { isExpired: true, validUntil: new Date() },
//                 });
//             }
//             const refund = await tx.payment.create({
//                 data: {
//                     transactionId: uuid(),
//                     amount: order.totalAmount,
//                     method: 'REFUND',
//                     status: 'COMPLETED',
//                     userId: order.userId,
//                     orderId: order.id,
//                 },
//             });
//             return { order, refund };
//         });
//         res.status(200).json({ success: true, data: result });
//     }
// );
