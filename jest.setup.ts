// jest.setup.ts
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config(); // explicitly loads your .env by default

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
