import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './subscription-controller';

/**
 * Get all licenses for the authenticated user
 */
export const getUserLicenses = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const licenses = await prisma.licenseKey.findMany({
            where: { userId },
            include: {
                subscription: {
                    include: {
                        software: true,
                        subscriptionPlan: true,
                    },
                },
            },
        });

        const filteredLicenses = licenses.filter(
            (license) =>
                license.subscription && license.subscription.status === 'ACTIVE'
        );
        res.status(200).json({
            success: true,
            message: 'Licenses retrieved successfully',
            data: filteredLicenses,
        });
    }
);

/**
 * Get a specific license by ID
 */
export const getLicenseById = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        const { licenseId } = req.params;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const license = await prisma.licenseKey.findFirst({
            where: {
                id: licenseId,
                userId,
            },
            include: {
                subscription: {
                    include: {
                        software: true,
                        subscriptionPlan: true,
                    },
                },
            },
        });

        if (
            !license ||
            !license.subscription ||
            license.subscription.status !== 'ACTIVE'
        ) {
            return next(new ErrorHandler('License not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'License retrieved successfully',
            data: license,
        });
    }
);

/**
 * Get all licenses for a specific software subscription
 */
export const getLicensesBySubscription = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        const { subscriptionId } = req.params;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const licenses = await prisma.licenseKey.findMany({
            where: {
                userId,
                softwareSubscriptionId: subscriptionId,
            },
            include: {
                subscription: {
                    include: {
                        software: true,
                        subscriptionPlan: true,
                    },
                },
            },
        });

        const filteredLicenses = licenses.filter(
            (license) =>
                license.subscription && license.subscription.status === 'ACTIVE'
        );

        res.status(200).json({
            success: true,
            message: 'Licenses retrieved successfully',
            data: filteredLicenses,
        });
    }
);

/**
 * Get all active licenses for the authenticated user
 */
export const getActiveLicenses = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const now = new Date();
        const licenses = await prisma.licenseKey.findMany({
            where: {
                userId,
                isActive: true,
                isExpired: false,
                validUntil: {
                    gte: now,
                },
            },
            include: {
                subscription: {
                    include: {
                        software: true,
                        subscriptionPlan: true,
                    },
                },
            },
        });

        const filteredLicenses = licenses.filter(
            (license) =>
                license.subscription && license.subscription.status === 'ACTIVE'
        );
        res.status(200).json({
            success: true,
            message: 'Active licenses retrieved successfully',
            data: filteredLicenses,
        });
    }
);

/**
 * Get all expired licenses for the authenticated user
 */
export const getExpiredLicenses = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const now = new Date();
        const licenses = await prisma.licenseKey.findMany({
            where: {
                userId,
                OR: [{ isExpired: true }, { validUntil: { lt: now } }],
            },
            include: {
                subscription: {
                    include: {
                        software: true,
                        subscriptionPlan: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            message: 'Expired licenses retrieved successfully',
            data: licenses,
        });
    }
);
