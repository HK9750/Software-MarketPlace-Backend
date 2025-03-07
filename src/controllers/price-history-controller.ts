import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';

export const createPriceHistory = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { softwareId, oldPrice, newPrice } = req.body;

        if (!softwareId) {
            return next(new ErrorHandler('softwareId is required', 400));
        }
        if (typeof oldPrice !== 'number' || typeof newPrice !== 'number') {
            return next(
                new ErrorHandler('oldPrice and newPrice must be numbers', 400)
            );
        }
        if (oldPrice < 0 || newPrice < 0) {
            return next(new ErrorHandler('Prices must be non-negative', 400));
        }
        if (oldPrice === newPrice) {
            return next(
                new ErrorHandler('oldPrice and newPrice must be different', 400)
            );
        }

        const history = await prisma.priceHistory.create({
            data: {
                softwareId,
                oldPrice,
                newPrice,
                changedAt: new Date(),
            },
        });

        res.status(201).json({ success: true, data: history });
    }
);

export const getSoftwarePriceHistory = AsyncErrorHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { softwareId } = req.params;
        if (!softwareId) {
            return next(
                new ErrorHandler('softwareId parameter is required', 400)
            );
        }

        const history = await prisma.priceHistory.findMany({
            where: { softwareId },
            orderBy: { changedAt: 'desc' },
        });

        if (history.length === 0) {
            return next(
                new ErrorHandler(
                    'No price history found for this software',
                    404
                )
            );
        }

        res.status(200).json({ success: true, data: history });
    }
);
