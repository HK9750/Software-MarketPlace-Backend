import express from 'express';
import {
    getSubscriptionPlans,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    getMySubscriptions,
} from '../controllers/subscription-controller';
import {
    authenticateUser,
    authorizeAdmin,
    authorizeSellerOrAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/plan', authenticateUser, authorizeAdmin, createSubscriptionPlan);
router.get('/plans', authenticateUser, getSubscriptionPlans);
router.patch(
    '/plan/:id',
    authenticateUser,
    authorizeAdmin,
    updateSubscriptionPlan
);

router.get('/me', authenticateUser, getMySubscriptions);

export default router;
