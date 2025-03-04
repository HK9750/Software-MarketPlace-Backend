import express from 'express';
import {
    getProfile,
    updateProfile,
    getSellerProfile,
    VerifySellerProfile,
} from '../controllers/profile-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/', authenticateUser, getProfile);
router.put('/', authenticateUser, updateProfile);
router.get('/seller/:id', authenticateUser, getSellerProfile);
router.put(
    '/seller/:id',
    authenticateUser,
    authorizeAdmin,
    VerifySellerProfile
);

export default router;
