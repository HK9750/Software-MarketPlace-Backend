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
router.post('/create', authenticateUser, createCategory);
router.put('/:id', authenticateUser, updateCategory);
router.delete('/:id', authenticateUser, deleteCategory);

export default router;
