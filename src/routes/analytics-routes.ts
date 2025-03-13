// analytics.routes.js
import express from 'express';
import {
    getConversionRate,
    getOrdersOverTime,
    getProductPerformance,
    getUserSignups,
} from '../controllers/analytics-controller';

const router = express.Router();

// Route for orders over time analytics
router.get('/orders-over-time', getOrdersOverTime);

// Route for conversion rate analytics
router.get('/conversion-rate', getConversionRate);

// Route for user signups analytics
router.get('/user-signups', getUserSignups);

// Route for product performance analytics
router.get('/product-performance', getProductPerformance);

export default router;
