import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './subscription-controller';

export const getCartItems = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }
        const cartItems = await prisma.cart.findMany({
            where: { userId },
            select: {
                id: true,
                subscription: {
                    select: {
                        id: true,
                        status: true,
                        price: true,
                        subscriptionPlan: {
                            select: {
                                name: true,
                            },
                        },
                        software: {
                            select: {
                                name: true,
                                description: true,
                                filePath: true,
                            },
                        },
                    },
                },
            },
        });

        const filteredCartItems = cartItems.filter(
            (item) => item.subscription && item.subscription.status === 'ACTIVE'
        );

        res.status(200).json({
            success: true,
            message: 'Cart items retrieved successfully',
            data: filteredCartItems,
        });
    }
);

export const addToCart = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { subscriptionId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }
        const existingCartItem = await prisma.cart.findFirst({
            where: { userId, subscriptionId },
        });
        if (existingCartItem) {
            return next(new ErrorHandler('Product already in cart', 400));
        }
        const cartItem = await prisma.cart.create({
            data: {
                userId,
                subscriptionId,
            },
            select: {
                id: true,
                subscription: {
                    select: {
                        price: true,
                        status: true,
                        subscriptionPlan: { select: { name: true } },
                        software: {
                            select: {
                                name: true,
                                description: true,
                                filePath: true,
                            },
                        },
                    },
                },
            },
        });

        if (
            !cartItem.subscription ||
            cartItem.subscription.status !== 'ACTIVE'
        ) {
            await prisma.cart.delete({ where: { id: cartItem.id } });
            return next(
                new ErrorHandler(
                    'Cannot add inactive subscription to cart',
                    400
                )
            );
        }

        res.status(201).json({
            success: true,
            message: 'Product added to cart successfully',
            data: cartItem,
        });
    }
);

export const removeItemFromCart = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { subscriptionId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }
        const cartItem = await prisma.cart.findFirst({
            where: { userId, subscriptionId },
        });
        if (!cartItem) {
            return next(new ErrorHandler('Software not found in cart', 404));
        }
        await prisma.cart.delete({
            where: { id: cartItem.id },
        });
        res.status(200).json({
            success: true,
            message: 'Software removed from cart successfully',
        });
    }
);

export const clearCart = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }
        await prisma.cart.deleteMany({
            where: { userId },
        });
        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully',
        });
    }
);
