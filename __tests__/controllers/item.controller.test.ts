import request from 'supertest';
import { serve } from '@hono/node-server';
import app from '../../src/app.js';
import prisma from '../../src/utils/prisma.js';
import { signToken } from '../../src/utils/jwt.js';

let server: ReturnType<typeof serve>;

beforeAll(async () => {
  // Explicitly clear dependent tables first to avoid foreign key constraints
  await prisma.rating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.image.deleteMany();
  await prisma.session.deleteMany();
  await prisma.log.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user explicitly
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: '$2a$12$hashedpasswordforsafety', // secure hashed password
      role: 'ADMIN'
    }
  });

  // Create regular user explicitly
  await prisma.user.create({
    data: {
      username: 'regularuser',
      password: '$2a$12$hashedpasswordforsafety', // pre-hashed
      role: 'PLAYER'
    }
  });

  server = serve({ fetch: app.fetch, port: 0 });
});

describe('ItemController', () => {
  describe('POST /items', () => {
    it('should allow admin to create an item', async () => {
      const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
      const token = signToken({ userId: admin!.id, role: 'ADMIN' });

      const response = await request(server)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Test item', file: 'https://example.com/image.png' })
        .expect(201);

      expect(response.body.prompt).toBe('Test item');
      expect(response.body.url).toBeDefined();
    });

    it('should forbid non-admin user', async () => {
      const user = await prisma.user.findUnique({ where: { username: 'testuser' } });
      const token = signToken({ userId: user!.id, role: 'PLAYER' });

      await request(server)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Regular user item', file: 'https://example.com/image.png' })
        .expect(403);
    });

    it('should reject unauthenticated request', async () => {
      await request(server)
        .post('/items')
        .send({ prompt: 'Unauthorized item', file: 'https://example.com/image.png' })
        .expect(401);
    });
  });

  describe('GET /items', () => {
    it('should return paginated items', async () => {
      const response = await request(server)
        .get('/items?page=1&limit=5')
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.currentPage).toBe(1);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(1);
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (server) server.close();
});
