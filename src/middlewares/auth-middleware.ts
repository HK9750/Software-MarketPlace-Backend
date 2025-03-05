import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ErrorHandler from '../utils/error-handler';
import config from '../config';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role?: string };
        }
    }
}

export const authenticateUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next(new ErrorHandler('Not authorized', 401));

    try {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
            id: string;
        };
        req.user = decoded;
        next();
    } catch (error) {
        return next(new ErrorHandler('Invalid or expired token', 401));
    }
};

export const authorizeAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.role !== 'ADMIN')
        return next(new ErrorHandler('Access denied', 403));
    next();
};

export const authorizeSellerOrAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.role !== 'SELLER' && req.user?.role !== 'ADMIN')
        return next(new ErrorHandler('Access denied', 403));
    next();
}

