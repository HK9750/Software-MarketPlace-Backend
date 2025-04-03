import express from 'express';
import {
    getSubscriptionPlans,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    getMySubscriptions,
    getSubscriptionPlanById,
    deleteSubscriptionPlan,
} from '../controllers/subscription-controller';
import {
    authenticateUser,
    authorizeAdmin,
    authorizeSellerOrAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.post(
    '/plan/create',
    authenticateUser,
    authorizeAdmin,
    createSubscriptionPlan
);
router.get('/plans', authenticateUser, getSubscriptionPlans);
router.get('/plan/:id', authenticateUser, getSubscriptionPlanById);
router.patch(
    '/plan/:id',
    authenticateUser,
    authorizeAdmin,
    updateSubscriptionPlan
);
router.delete(
    '/plan/:id',
    authenticateUser,
    authorizeAdmin,
    deleteSubscriptionPlan
);

router.get('/me', authenticateUser, getMySubscriptions);

export default router;
