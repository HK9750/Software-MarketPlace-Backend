import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';

export const AddReview = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { rating, comment, softwareId } = req.body;

        if (!rating || !comment) {
            return next(new ErrorHandler('Please provide rating and comment', 400));
        }

        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const license = await prisma.licenseKey.findFirst({
            where: { userId, softwareId },
        });
        if (!license) {
            return next(new ErrorHandler('You are not eligible to review this product', 403));
        }

        const existingReview = await prisma.review.findFirst({
            where: { userId, softwareId },
        });
        if (existingReview) {
            return next(new ErrorHandler('You have already reviewed this product', 400));
        }

        const review = await prisma.$transaction(async (tx) => {
            const newReview = await tx.review.create({
                data: {
                    userId,
                    softwareId,
                    rating,
                    comment,
                },
            });

            const aggregate = await tx.review.aggregate({
                _avg: { rating: true },
                where: { softwareId },
            });
            const newAverageRating = aggregate._avg.rating || 0;

            await tx.software.update({
                where: { id: softwareId },
                data: { averageRating: newAverageRating },
            });

            return newReview;
        });

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: review,
        });
    }
);

export const GetProductReviews = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {

        const reviews = await prisma.review.findMany({
            where: {
                softwareId: req.params.softwareId as string,
                isDeleted: false,
            },
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            data: reviews,
        });
    }
);

export const DeleteReview = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const review = await prisma.review.findFirst({
            where: {
                id: req.params.id as string,
                userId: req.user?.id,
            },
        });

        if (!review) {
            return next(new ErrorHandler('Review not found', 404));
        }

        await prisma.review.update({
            where: {
                id: req.params.reviewId as string,
            },
            data: {
                isDeleted: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
        });
    }
);
