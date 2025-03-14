// src/routes/index.ts
import { Hono } from 'hono';
import authRouter from './auth.routes.js';
import itemRouter from './item.routes.js';
import ratingRouter from './rating.routes.js';

export const mainRouter = new Hono();

mainRouter.get('/', (c) => c.json({ message: 'API' }));
mainRouter.route('/auth', authRouter);
mainRouter.route('/items', itemRouter);
mainRouter.route('/ratings', ratingRouter);
