import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './subscription-controller';

/**
 * Get all licenses for the authenticated user
 */
export const GetUserLicenses = AsyncErrorHandler(
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

        res.status(200).json({
            success: true,
            message: 'Licenses retrieved successfully',
            data: licenses,
        });
    }
);

/**
 * Get a specific license by ID for the authenticated user
 */
export const GetLicenseById = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { licenseId } = req.params;
        const userId = req.user?.id;

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

        if (!license) {
            return next(
                new ErrorHandler('License not found or not authorized', 404)
            );
        }

        res.status(200).json({
            success: true,
            message: 'License retrieved successfully',
            data: license,
        });
    }
);

/**
 * Validate a license key
 */
export const ValidateLicense = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { key } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const license = await prisma.licenseKey.findFirst({
            where: {
                key,
                userId,
            },
            include: {
                subscription: {
                    include: {
                        software: true,
                    },
                },
            },
        });

        if (!license) {
            return next(new ErrorHandler('Invalid license key', 404));
        }

        // Check if the license is valid
        const isValid =
            license.isActive &&
            !license.isExpired &&
            license.validUntil > new Date();

        if (!isValid) {
            return res.status(200).json({
                success: false,
                message: 'License key is invalid or expired',
                isValid: false,
            });
        }

        res.status(200).json({
            success: true,
            message: 'License key is valid',
            isValid: true,
            data: {
                licenseId: license.id,
                softwareName: license.subscription.software.name,
                validUntil: license.validUntil,
            },
        });
    }
);

/**
 * Activate a license key (mark it as redeemed)
 */
export const ActivateLicense = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { key } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const license = await prisma.licenseKey.findFirst({
            where: {
                key,
                userId,
            },
        });

        if (!license) {
            return next(new ErrorHandler('Invalid license key', 404));
        }

        // Check if the license is already redeemed
        if (license.redeemedAt) {
            return res.status(200).json({
                success: false,
                message: 'License key already activated',
                data: license,
            });
        }

        // Activate the license
        const updatedLicense = await prisma.licenseKey.update({
            where: { id: license.id },
            data: {
                redeemedAt: new Date(),
                isActive: true,
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
            message: 'License key activated successfully',
            data: updatedLicense,
        });
    }
);

/**
 * Deactivate a license key
 */
export const DeactivateLicense = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { licenseId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const license = await prisma.licenseKey.findFirst({
            where: {
                id: licenseId,
                userId,
            },
        });

        if (!license) {
            return next(
                new ErrorHandler('License not found or not authorized', 404)
            );
        }

        const updatedLicense = await prisma.licenseKey.update({
            where: { id: licenseId },
            data: { isActive: false },
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
            message: 'License deactivated successfully',
            data: updatedLicense,
        });
    }
);

/**
 * Renew a license by extending its validity period
 */
export const RenewLicense = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { licenseId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        // Check if license exists and belongs to user
        const license = await prisma.licenseKey.findFirst({
            where: {
                id: licenseId,
                userId,
            },
            include: {
                subscription: {
                    include: {
                        subscriptionPlan: true,
                    },
                },
            },
        });

        if (!license) {
            return next(
                new ErrorHandler('License not found or not authorized', 404)
            );
        }

        // Get subscription plan duration in months
        const durationInMonths = license.subscription.subscriptionPlan.duration;

        // Calculate new expiry date
        const currentValidUntil = new Date(license.validUntil);
        const newValidUntil = new Date(currentValidUntil);
        newValidUntil.setMonth(newValidUntil.getMonth() + durationInMonths);

        // Update license
        const updatedLicense = await prisma.licenseKey.update({
            where: { id: licenseId },
            data: {
                validUntil: newValidUntil,
                isExpired: false,
                isActive: true,
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
            message: 'License renewed successfully',
            data: updatedLicense,
        });
    }
);

/**
 * Check for expired licenses and update their status
 * This would typically be called by a scheduled job
 */
export const CheckExpiredLicenses = AsyncErrorHandler(
    async (_req: Request, res: Response, _next: NextFunction) => {
        const now = new Date();

        const expiredLicenses = await prisma.licenseKey.updateMany({
            where: {
                validUntil: {
                    lt: now,
                },
                isExpired: false,
            },
            data: {
                isExpired: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Expired licenses updated successfully',
            count: expiredLicenses.count,
        });
    }
);
