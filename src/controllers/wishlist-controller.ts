import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';


export const GetWishlist = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const wishlist = await prisma.wishlist.findMany({
            where: { userId },
            include: {
                software: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Wishlist retrieved successfully',
            data: wishlist,
        });
    }
);

export const ToggleWishlist = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { softwareId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const existingWishlist = await prisma.wishlist.findFirst({
            where: { userId, softwareId },
        });

        if (existingWishlist) {
            await prisma.wishlist.deleteMany({
                where: { userId, softwareId },
            });
            return res.status(200).json({
                success: true,
                message: 'Product removed from wishlist successfully',
                toggled: false,
            });
        } else {
            const wishlist = await prisma.wishlist.create({
                data: { userId, softwareId },
            });
            return res.status(201).json({
                success: true,
                message: 'Product added to wishlist successfully',
                toggled: true, 
                data: wishlist,
            });
        }
    }
);