import { Hono } from 'hono';
import authRouter from './auth.routes.js';
import itemRouter from './item.routes.js';
import ratingRouter from './rating.routes.js';

const mainRouter = new Hono();

mainRouter.get('/', (c) => {
  return c.json({
    message: 'Welcome to the Rating Game API (Hono)',
    routes: {
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
      },
      items: {
        getAll: 'GET /items',
        getById: 'GET /items/:id',
        create: 'POST /items (admin)',
        delete: 'DELETE /items/:id (admin)',
      },
      ratings: {
        upsert: 'POST /ratings',
      },
    },
  });
});

mainRouter.route('/auth', authRouter);
mainRouter.route('/items', itemRouter);
mainRouter.route('/ratings', ratingRouter);

export default mainRouter;
