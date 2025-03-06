import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
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

    if (!token || token === 'null' || token === 'undefined') {
        return next(new ErrorHandler('Not authorized', 401));
    }

    console.log('Token from req.headers is', token);

    try {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
            algorithms: ['HS256'],
            complete: true,
        }) as any;
        console.log(decoded);
        req.user = decoded.payload;
        next();
    } catch (error: any) {
        return next(
            new ErrorHandler(`Invalid or expired token:${error.message}`, 401)
        );
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
};
