// analytics.routes.js
import express from 'express';
import {
    getConversionRate,
    getDashboardSummary,
    getOrdersOverTime,
    getProductPerformance,
    getUserSignups,
    invalidateAnalyticsCache,
} from '../controllers/analytics-controller';

const router = express.Router();

router.get('/dashboard-summary', getDashboardSummary);
router.get('/conversion-rate', getConversionRate);
router.get('/user-signups', getUserSignups);
router.get('/orders-over-time', getOrdersOverTime);
router.get('/product-performance', getProductPerformance);
router.post('/invalidate-cache', invalidateAnalyticsCache);

export default router;
