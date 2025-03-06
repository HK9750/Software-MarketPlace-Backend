import express from 'express';
import {
    AddToWishlist,
    DeleteFromWishlist,
    GetWishlist,
} from '../controllers/wishlist-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/', authenticateUser, AddToWishlist);
router.get('/:softwareId', authenticateUser, DeleteFromWishlist);
router.put('/', authenticateUser, GetWishlist);

export default router;
