import { Hono } from 'hono';
import { RatingController } from '../controllers/rating.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const ratingRouter = new Hono();

ratingRouter.post('/', requireAuth, RatingController.rateItem);

export default ratingRouter;
