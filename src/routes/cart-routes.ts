import express from 'express';
import {
    addToCart,
    clearCart,
    getCartItems,
    removeItemFromCart,
} from '../controllers/cart-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/', authenticateUser, getCartItems);
router.post('/', authenticateUser, addToCart);
router.delete('/', authenticateUser, clearCart);
router.delete('/:softwareId', authenticateUser, removeItemFromCart);

export default router;
