import { Router } from 'express';
import suggestionsRouter from './suggestions';
import notificationsRouter from './notifications';

const router = Router();

// Mount routes
router.use('/api', suggestionsRouter);
router.use('/api', notificationsRouter);

export default router;
