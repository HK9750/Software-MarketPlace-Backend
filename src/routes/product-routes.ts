import express from 'express';
import {
    createProduct,
    getAllProducts,
    getAllProductsBySeller,
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

router.get('/', authenticateUser, getAllProducts);
router.get(
    '/seller/:id',
    authenticateUser,
    authorizeSellerOrAdmin,
    getAllProductsBySeller
);
router.get('/:id', authenticateUser, getProduct);

export default router;
