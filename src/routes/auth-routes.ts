import express from 'express';
import {
    register,
    activate,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
    socialLogin,
    changePassword,
} from '../controllers/auth-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/register', register);
router.post('/activate', activate);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/social', socialLogin);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.put('/change-password', authenticateUser, changePassword);

export default router;
