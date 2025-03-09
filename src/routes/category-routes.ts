import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategory,
    updateCategory,
} from '../controllers/category-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategory);
router.post('/', authenticateUser, authorizeAdmin, createCategory);
router.put('/:id', authenticateUser, authorizeAdmin, updateCategory);

export default router;
