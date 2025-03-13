import { Hono } from 'hono';
import { ItemController } from '../controllers/item.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const itemRouter = new Hono();

itemRouter.post('/', requireAuth, requireAdmin, ItemController.createItem);
itemRouter.delete('/:id', requireAuth, requireAdmin, ItemController.deleteItem);

itemRouter.get('/', ItemController.getItems);
itemRouter.get('/:id', ItemController.getItemById);

export default itemRouter;
