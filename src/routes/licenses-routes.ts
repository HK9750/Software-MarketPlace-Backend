import express from 'express';
import {
    getUserLicenses,
    getLicenseById,
    getLicensesBySubscription,
    getActiveLicenses,
    getExpiredLicenses,
} from '../controllers/licenses-controller';
import { authenticateUser } from '../middlewares/auth-middleware';

const router = express.Router();

/**
 * License routes
 * Base path: /api/licenses
 */

// Get all licenses for the authenticated user
router.get('/', authenticateUser, getUserLicenses);

// Get all active licenses for the authenticated user
router.get('/active', authenticateUser, getActiveLicenses);

// Get all expired licenses for the authenticated user
router.get('/expired', authenticateUser, getExpiredLicenses);

// Get all licenses for a specific software subscription
router.get(
    '/subscription/:subscriptionId',
    authenticateUser,
    getLicensesBySubscription
);

// Get a specific license by ID
router.get('/:licenseId', authenticateUser, getLicenseById);

export default router;
