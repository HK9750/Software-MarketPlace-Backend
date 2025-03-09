import express from 'express';
import {
    GetWishlist,
    ToggleWishlist,
} from '../controllers/wishlist-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/toggle/:softwareId', authenticateUser, ToggleWishlist);
router.get('/', authenticateUser, GetWishlist);

export default router;
