import express from 'express';
import { getUserNotifications, markNotificationAsRead } from '../controllers/notification-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/read/:id', authenticateUser, markNotificationAsRead);
router.get('/', authenticateUser, getUserNotifications );

export default router;
 