import express from 'express';
import {
    GetUserLicenses,
    GetLicenseById,
    ValidateLicense,
    ActivateLicense,
    DeactivateLicense,
    RenewLicense,
    CheckExpiredLicenses,
} from '../controllers/licenses-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

// User license routes (requires authentication)
router.get('/', authenticateUser, GetUserLicenses);
router.get('/:licenseId', authenticateUser, GetLicenseById);
router.post('/validate', authenticateUser, ValidateLicense);
router.post('/activate', authenticateUser, ActivateLicense);
router.patch('/:licenseId/deactivate', authenticateUser, DeactivateLicense);
router.patch('/:licenseId/renew', authenticateUser, RenewLicense);

// Admin-only route for maintenance
router.post('/check-expired', authorizeAdmin, CheckExpiredLicenses);

export default router;
