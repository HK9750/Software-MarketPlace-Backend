import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';

export const createPayment = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { amount, method, transactionId, userId, orderId } = req.body;

        if (!amount || !method || !transactionId || !userId) {
            return next(
                new ErrorHandler('Missing required payment fields', 400)
            );
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }

        const existingPayment = await prisma.payment.findUnique({
            where: { transactionId },
        });
        if (existingPayment) {
            return next(new ErrorHandler('Transaction already processed', 409));
        }

        let order = null;
        if (orderId) {
            order = await prisma.order.findUnique({ where: { id: orderId } });
            if (!order) {
                return next(new ErrorHandler('Order not found', 404));
            }
            if (order.status !== 'PENDING') {
                return next(
                    new ErrorHandler('Order is already processed', 400)
                );
            }
        }

        const payment = await prisma.payment.create({
            data: {
                amount,
                method,
                transactionId,
                userId,
                orderId,
                status: 'COMPLETED',
            },
        });

        if (orderId) {
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'COMPLETED',
                    payment: { connect: { id: payment.id } },
                },
            });
        }

        return res.status(201).json({ message: 'Payment successful', payment });
    }
);
