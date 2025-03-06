import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProduct,
    updateProduct,
    UpdateStatus,
} from '../controllers/product-controller';
import {
    authenticateUser,
    authorizeAdmin,
    authorizeSellerOrAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.post('/', authenticateUser, authorizeSellerOrAdmin, createProduct);

router.put('/:id', authenticateUser, authorizeSellerOrAdmin, updateProduct);
router.put(
    '/:id/status/:status',
    authenticateUser,
    authorizeAdmin,
    UpdateStatus
);

router.get('/', getAllProducts);
router.get('/:id', getProduct);

export default router;
