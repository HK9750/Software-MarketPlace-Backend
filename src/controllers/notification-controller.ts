import { Request, Response, NextFunction } from 'express';
import AsyncErrorHandler from '../utils/async-handler';
import ErrorHandler from '../utils/error-handler';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './subscription-controller';

export const getUserNotifications = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user.id,
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
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: notifications,
        });
    }
);

export const markNotificationAsRead = AsyncErrorHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const notification = await prisma.notification.update({
            where: {
                id: req.params.id,
            },
            data: {
                isRead: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification,
        });
    }
);
