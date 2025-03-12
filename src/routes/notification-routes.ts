import express from 'express';
import {
    getUserNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../controllers/notification-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.put('/read/:id', authenticateUser, markNotificationAsRead);
router.get('/', authenticateUser, getUserNotifications);
router.put('/read/all', authenticateUser, markAllNotificationsAsRead);

export default router;
