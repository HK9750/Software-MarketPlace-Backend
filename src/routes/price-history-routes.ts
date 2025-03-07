import express from 'express';
import {
    createPriceHistory,
    getSoftwarePriceHistory,
} from '../controllers/price-history-controller';

const router = express.Router();

router.post('/create', createPriceHistory);
router.get('/:softwareId', getSoftwarePriceHistory);

export default router;
