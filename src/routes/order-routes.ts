import express from 'express';
import {
    createOrder,
    getAllOrders,
    getOrder,
} from '../controllers/order-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/create', authenticateUser, createOrder);
router.get('/:id', authenticateUser, getOrder);
router.get('/', authenticateUser, getAllOrders);
// router.get('/history/:id', authenticateUser, getUserOrderHistory);
// router.patch('/status/:id', authenticateUser, updateOrderStatus);
// router.post('/add-item', authenticateUser, addOrderItem);
// router.post('/cancel-with-refund', authenticateUser, cancelOrderWithRefund);

export default router;
