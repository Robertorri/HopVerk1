import request from 'supertest';
import { serve } from '@hono/node-server';
import app from '../../src/app.js';
import prisma from '../../src/utils/prisma.js';

let server: ReturnType<typeof serve>;

beforeAll(async () => {
  // Explicitly clear dependent tables first to avoid foreign key constraints
  await prisma.rating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.image.deleteMany();
  await prisma.session.deleteMany();
  await prisma.log.deleteMany();
  await prisma.user.deleteMany();

  server = serve({ fetch: app.fetch, port: 0 });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (server) server.close();
});

describe('AuthController', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({ username: 'testuser', password: 'Test123!' })
        .expect(201)
        .catch(err => {
          console.log('Error response:', err.response.body); // Log the error response
          throw err;
        });

      expect(response.body.message).toBe('Registration successful');
      expect(response.body.id).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({ username: 'weakuser', password: '123' })
        .expect(400);

      expect(response.body.error).toMatch(/Password must/);
    });

    it('should reject duplicate usernames', async () => {
      await request(server)
        .post('/auth/register')
        .send({ username: 'duplicate', password: 'Test123!' })
        .expect(201);

      const response = await request(server)
        .post('/auth/register')
        .send({ username: 'duplicate', password: 'Test123!' })
        .expect(400);

      expect(response.body.error).toBe('User with this username already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should log in a valid user', async () => {
      await request(server)
        .post('/auth/register')
        .send({ username: 'validuser', password: 'Test123!' });

      const response = await request(server)
        .post('/auth/login')
        .send({ username: 'validuser', password: 'Test123!' })
        .expect(200);

      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid login', async () => {
      await request(server)
        .post('/auth/login')
        .send({ username: 'wronguser', password: 'wrongpassword' })
        .expect(401);
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (server) server.close();
});