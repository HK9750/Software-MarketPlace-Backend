import express from 'express';
import {
    AddToWishlist,
    DeleteFromWishlist,
    GetWishlist,
} from '../controllers/wishlist-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/', authenticateUser, AddToWishlist);
router.put('/:softwareId', authenticateUser, DeleteFromWishlist);
router.get('/', authenticateUser, GetWishlist);

export default router;
