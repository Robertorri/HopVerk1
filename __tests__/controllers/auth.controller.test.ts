import request from 'supertest';
import { serve } from '@hono/node-server';
import app from '../../src/app.js';
import prisma from '../../src/utils/prisma.js';
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

  // Seed the database with a test user
  await prisma.user.create({
    data: {
      username: 'authuser', // Unique username for auth tests
      password: await bcrypt.hash('Test123!', 12), // Hash the password
      role: 'PLAYER',
    },
  });

  console.log('Test user created for auth tests');

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
        .send({ username: 'newuser', password: 'Test123!' }) // Unique username
        .expect(201)
        .catch(err => {
          console.log('Error response:', err.response ? err.response.body : err); // Log the error response
          throw err;
        });

      expect(response.body.message).toBe('Registration successful');
      expect(response.body.id).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({ username: 'weakuser', password: '123' }) // Unique username
        .expect(400);

      expect(response.body.error).toMatch(/Password must/);
    });

    it('should reject duplicate usernames', async () => {
      await request(server)
        .post('/auth/register')
        .send({ username: 'duplicateuser', password: 'Test123!' }) // Unique username
        .expect(201);

      const response = await request(server)
        .post('/auth/register')
        .send({ username: 'duplicateuser', password: 'Test123!' }) // Duplicate username
        .expect(400);

      expect(response.body.error).toBe('User with this username already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should log in a valid user', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ username: 'authuser', password: 'Test123!' }) // Use the seeded user
        .expect(200)
        .catch(err => {
          console.log('Login error:', err.response ? err.response.body : err); // Log the error
          throw err;
        });

      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid login', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({ username: 'wronguser', password: 'wrongpassword' }) // Invalid credentials
        .expect(401)
        .catch(err => {
          console.log('Invalid login error:', err.response ? err.response.body : err); // Log the error
          throw err;
        });

      expect(response.body.error).toBe('Invalid username or password');
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (server) server.close();
});