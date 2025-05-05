// analytics.routes.js
import express from 'express';
import {
    getConversionRate,
    getDashboardSummary,
    getOrdersOverTime,
    getProductPerformance,
    getSellerConversionRates,
    getSellerDashboardSummary,
    getSellerProducts,
    getSellerRevenueOverTime,
    getSellerSalesOverTime,
    getSellerTopPerforming,
    getUserSignups,
    invalidateAnalyticsCache,
    invalidateSellerAnalyticsCache,
} from '../controllers/analytics-controller';

const router = express.Router();

router.get('/dashboard-summary', getDashboardSummary);
router.get('/conversion-rate', getConversionRate);
router.get('/user-signups', getUserSignups);
router.get('/orders-over-time', getOrdersOverTime);
router.get('/product-performance', getProductPerformance);
router.post('/invalidate-cache', invalidateAnalyticsCache);

// Seller Analytics

router.get('/seller/products', getSellerProducts);
router.get('/seller/revenue', getSellerRevenueOverTime);
router.get('/seller/sales', getSellerSalesOverTime);
router.get('/seller/conversions', getSellerConversionRates);
router.get('/seller/top-performing', getSellerTopPerforming);
router.get('/seller/dashboard-summary', getSellerDashboardSummary);
router.post('/seller/invalidate-cache', invalidateSellerAnalyticsCache);

export default router;
