import { Hono } from 'hono';
import { ItemController } from '../controllers/item.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const itemRouter = new Hono();

// Admin routes
itemRouter.post('/', requireAuth, requireAdmin, ItemController.createItem);
itemRouter.delete('/:id', requireAuth, requireAdmin, ItemController.deleteItem);

// Public routes
itemRouter.get('/', ItemController.getItems);
itemRouter.get('/:id', ItemController.getItemById);

export default itemRouter;
