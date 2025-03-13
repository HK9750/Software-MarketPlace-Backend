import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategory,
    updateCategory,
    deleteCategory,
} from '../controllers/category-controller';
import {
    authenticateUser,
    authorizeAdmin,
} from '../middlewares/auth-middleware';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategory);
router.post('/create', authenticateUser, authorizeAdmin, createCategory);
router.put('/:id', authenticateUser, authorizeAdmin, updateCategory);
router.delete('/:id', authenticateUser, authorizeAdmin, deleteCategory);

export default router;
