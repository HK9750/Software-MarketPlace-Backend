import express from 'express';
import {
    register,
    activate,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
    socialLogin,
} from '../controllers/auth-controller';

const router = express.Router();

router.post('/register', register);
router.post('/activate', activate);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/social', socialLogin);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
