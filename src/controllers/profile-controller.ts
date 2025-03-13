import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { exclude } from '../utils/exclude';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './subscription-controller';

export const getProfile = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user?.id,
            },
            include: {
                profile: true,
                sellerProfile: true,
                cart: true,
            },
        });

        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }

        const cartCount = await prisma.cart.count({
            where: {
                userId: user.id,
            },
        });

        const notifications = await prisma.notification.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                message: true,
                type: true,
                isRead: true,
                createdAt: true,
                software: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const safeUser = exclude(user, ['password']);

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            user: {
                ...safeUser,
                cartCount,
                notifications,
            },
        });
    }
);

export const setupProfile = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { firstName, lastName, phone, address, websiteLink, role } =
            req.body;
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const data: any = {
            profile: {
                create: {
                    firstName,
                    lastName,
                    phone,
                    address,
                },
            },
        };

        // Update the role if provided
        if (role !== undefined) {
            data.role = role;
        }

        // If a websiteLink is provided, create a seller profile as well
        if (websiteLink) {
            data.sellerProfile = {
                create: {
                    websiteLink,
                },
            };
        }

        // Update the user with the new profile (this uses update because the user already exists)
        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                profile: true,
                sellerProfile: websiteLink
                    ? { select: { websiteLink: true } }
                    : true,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Profile setup successfully',
            data: user,
        });
    }
);

export const UpdateProfile = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const { firstName, lastName, phone, address, websiteLink, role } =
            req.body;
        const userId = req.user?.id;
        if (!userId) {
            return next(new ErrorHandler('User not authenticated', 401));
        }

        const data: any = {};

        if (role !== undefined) {
            data.role = role;
        }

        if (
            firstName !== undefined ||
            lastName !== undefined ||
            phone !== undefined ||
            address !== undefined
        ) {
            data.profile = {
                update: {
                    firstName,
                    lastName,
                    phone,
                    address,
                },
            };
        }

        if (websiteLink !== undefined) {
            data.sellerProfile = {
                update: {
                    websiteLink,
                },
            };
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            include: {
                profile: true,
                sellerProfile: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user,
        });
    }
);

export const getSellerProfile = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                id: true,
                username: true,
                email: true,
                profile: true,
                sellerProfile: {
                    select: {
                        id: true,
                        verified: true,
                        websiteLink: true,
                    },
                },
            },
        });

        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: user,
        });
    }
);

export const VerifySellerProfile = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { verified } = req.body;

        const user = await prisma.user.update({
            where: {
                id: req.params.id,
            },
            data: {
                sellerProfile: {
                    update: {
                        verified,
                    },
                },
            },
            select: {
                id: true,
                username: true,
                email: true,
                sellerProfile: {
                    select: {
                        id: true,
                        verified: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            message: 'Seller profile verified successfully',
            data: user,
        });
    }
);

export const getUsers = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { role, verified } = req.query;
        const isVerified =
            verified === 'true'
                ? true
                : verified === 'false'
                  ? false
                  : undefined;

        const users = await prisma.user.findMany({
            where: {
                role: role ? (role as UserRole) : undefined,
                sellerProfile:
                    isVerified !== undefined
                        ? { verified: isVerified }
                        : undefined,
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                profile: true,
                sellerProfile: {
                    select: {
                        id: true,
                        verified: true,
                        websiteLink: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            users,
        });
    }
);

export const getMyProfile = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.user?.id,
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                profile: true,
                sellerProfile: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: user,
        });
    }
);
