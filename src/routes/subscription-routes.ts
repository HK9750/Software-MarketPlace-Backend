import express from 'express';
import {
    getSubscriptionPlan,
    subscribeToPlan,
    getSubscriptionPlans,
    cancelSubscription,
    createSubscriptionPlan,
    deleteSubscriptionPlan,
    updateSubscriptionPlan,
    getUserSubscription,
} from '../controllers/subscription-controller';
import {
    authenticateUser,
    authorizeAdmin,
    authorizeSellerOrAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/plans', authenticateUser, getSubscriptionPlans);
router.get('/plan/:id', authenticateUser, getSubscriptionPlan);
router.get('/user', authenticateUser, getUserSubscription);
router.post('/subscribe', authenticateUser, subscribeToPlan);
router.post('/plan', authenticateUser, authorizeAdmin, createSubscriptionPlan);
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
router.delete('/cancel', authenticateUser, cancelSubscription);

export default router;
