import express from 'express';
import {
    getDashboardStats,
    getSoftwareStats,
    getUserStats,
    getOrderStats,
} from '../controllers/dashboard-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/stats', authenticateUser, authorizeAdmin, getDashboardStats);
router.get(
    '/software-stats',
    authenticateUser,
    authorizeAdmin,
    getSoftwareStats
);
router.get('/user-stats', authenticateUser, authorizeAdmin, getUserStats);
router.get('/order-stats', authenticateUser, authorizeAdmin, getOrderStats);

export default router;
