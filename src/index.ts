import { Hono } from 'hono';
import mainRouter from './routes/index.routes.js';

import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.route('/', mainRouter);

const port = parseInt(process.env.PORT || '3000', 10);

app.fire({ port });
