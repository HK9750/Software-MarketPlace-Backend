import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategory,
    updateCategory,
} from '../controllers/category-controller';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategory);
router.post('/', createCategory);
router.put('/:id', updateCategory);

export default router;
