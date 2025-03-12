import express from 'express';
import {
    getUsers,
    UpdateProfile,
    getProfile,
    setupProfile,
    getSellerProfile,
    VerifySellerProfile,
    getMyProfile,
} from '../controllers/profile-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/', authenticateUser, getProfile);
router.get('/me', authenticateUser, getMyProfile)
router.put('/setup', authenticateUser, setupProfile);
router.put('/update', authenticateUser, UpdateProfile);
router.get('/seller/:id', authenticateUser, getSellerProfile);
router.get('/users', authenticateUser, authorizeAdmin, getUsers);
router.put(
    '/seller/:id',
    authenticateUser,
    authorizeAdmin,
    VerifySellerProfile
);

export default router;
