// src/app.ts
import { Hono } from 'hono';
import { mainRouter } from './routes/index.js'; // Correct named import

const app = new Hono();

app.route('/', mainRouter);

export default app;
