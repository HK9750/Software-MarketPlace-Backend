import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';

export const AddToWishlist = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { softwareId } = req.body;

        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const existingWishlist = await prisma.wishlist.findFirst({
            where: { userId, softwareId },
        });
        if (existingWishlist) {
            return next(new ErrorHandler('Product already in wishlist', 400));
        }

        const wishlist = await prisma.wishlist.create({
            data: {
                userId,
                softwareId,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Product added to wishlist successfully',
            data: wishlist,
        });
    }
);

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

export const DeleteFromWishlist = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const softwareId = req.params.softwareId;

        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const existingWishlist = await prisma.wishlist.findFirst({
            where: { userId, softwareId },
        });

        if (!existingWishlist) {
            return next(new ErrorHandler('Product not in wishlist', 400));
        }

        await prisma.wishlist.deleteMany({
            where: { userId, softwareId },
        })

    
        res.status(200).json({
            success: true,
            message: 'Product removed from wishlist successfully',
        });
    }
);