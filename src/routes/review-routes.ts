import express from 'express';
import {
    AddReview,
    DeleteReview,
    GetProductReviews,
} from '../controllers/review-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/', authenticateUser, AddReview);
router.get('/:softwareId', authenticateUser, GetProductReviews);
router.put('/delete/:id', authenticateUser, authorizeAdmin, DeleteReview);

export default router;
