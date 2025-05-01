import express from 'express';
import { createPayment } from '../controllers/payment-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/create', authenticateUser, createPayment);

export default router;
