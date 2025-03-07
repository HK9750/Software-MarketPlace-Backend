import express from 'express';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import config from './config';
import rateLimit from 'express-rate-limit';
import errorMiddleware from './middlewares/error-middleware';

// Importing Routes
import AuthRoutes from './routes/auth-routes';
import ProfileRoutes from './routes/profile-routes';
import ProductRoutes from './routes/product-routes';
import CategoryRoutes from './routes/category-routes';
import ReviewRoutes from './routes/review-routes';
import WishListRoutes from './routes/wishlist-routes';
import CartRoutes from './routes/cart-routes';
import OrderRoutes from './routes/order-routes';
import SubscriptionRoutes from './routes/subscription-routes';
import PriceHistoryRoutes from './routes/price-history-routes';

dotenv.config();

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const options = {
    origin: config.CLIENT_URL,
    credentials: true,
};

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload());
app.use(cors(options));
app.use(express.json({ limit: '50mb' }));
app.use(limiter);

app.use('/api/v1/auth', AuthRoutes);
app.use('/api/v1/profile', ProfileRoutes);
app.use('/api/v1/products', ProductRoutes);
app.use('/api/v1/categories', CategoryRoutes);
app.use('/api/v1/reviews', ReviewRoutes);
app.use('/api/v1/wishlist', WishListRoutes);
app.use('/api/v1/cart', CartRoutes);
app.use('/api/v1/orders', OrderRoutes);
app.use('/api/v1/subscriptions', SubscriptionRoutes);
app.use('/api/v1/price-history', PriceHistoryRoutes);

app.get('/test', (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        message: 'API is working!',
        success: true,
    });
});

app.use(function (req: Request, res: Response, next: NextFunction) {
    const err = new Error('Route not found') as any;
    err.statusCode = 404;
    next(err);
});

app.use(errorMiddleware);

export default app;
