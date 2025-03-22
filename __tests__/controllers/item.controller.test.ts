import request from 'supertest';
import { serve } from '@hono/node-server';
import app from '../../src/app.js';
import prisma from '../../src/utils/prisma.js';
import { signToken } from '../../src/utils/jwt.js';
import bcrypt from 'bcryptjs';

let server: ReturnType<typeof serve>;

beforeAll(async () => {
  // Explicitly clear dependent tables first to avoid foreign key constraints
  await prisma.rating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.image.deleteMany(); // Clear images before users
  await prisma.session.deleteMany();
  await prisma.log.deleteMany();
  await prisma.user.deleteMany(); // Clear users last

  console.log('Database cleared');

  // Create admin user explicitly
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: await bcrypt.hash('adminpassword', 12), // Hash the password
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', admin);

  // Create regular user explicitly
  const regularUser = await prisma.user.create({
    data: {
      username: 'regularuser',
      password: await bcrypt.hash('regularpassword', 12), // Hash the password
      role: 'PLAYER',
    },
  });

  console.log('Regular user created:', regularUser);

  // Create testuser explicitly
  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      password: await bcrypt.hash('testpassword', 12), // Hash the password
      role: 'PLAYER',
    },
  });

  console.log('Test user created:', testUser);

  // Seed the database with test items
  const items = await prisma.image.createMany({
    data: [
      {
        url: 'https://example.com/image1.png',
        prompt: 'Test item 1',
        uploadedById: admin.id,
      },
      {
        url: 'https://example.com/image2.png',
        prompt: 'Test item 2',
        uploadedById: regularUser.id,
      },
      {
        url: 'https://example.com/image3.png',
        prompt: 'Test item 3',
        uploadedById: testUser.id,
      },
    ],
  });

  console.log('Seeded items:', items);

  server = serve({ fetch: app.fetch, port: 0 });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (server) server.close();
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