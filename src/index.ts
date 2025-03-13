import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { sign, verify } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cloudinary } from "./cloudinary";
import { authMiddleware } from "./middleware/authMiddleware";  // ✅ Keep this
import { z } from "zod";

const app = new Hono();
const prisma = new PrismaClient();
const JWT_SECRET = "supersecret"; // Change this in .env

// ✅ Remove the duplicated authMiddleware function!

// Admin Middleware
const adminMiddleware = async (c, next) => {
  const user = c.get("user");
  if (user.role !== "ADMIN") return c.json({ error: "Forbidden" }, 403);
  await next();
};

// Register Route
app.post("/auth/register", async (c) => {
  const { username, password } = await c.req.json();
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { username, password: hashedPassword, role: "PLAYER" } });
  return c.json({ message: "User registered" });
});

// Login Route
app.post("/auth/login", async (c) => {
  const { username, password } = await c.req.json();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return c.json({ error: "Invalid credentials" }, 401);

  const token = sign({ id: user.id, role: user.role }, JWT_SECRET);
  return c.json({ token });
});

// Upload Image (Admin Only)
app.post("/admin/upload", authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.formData();
  const file = body.get("file") as File;
  if (!file) return c.json({ error: "No file uploaded" }, 400);

  const uploadResult = await cloudinary.uploader.upload(file);
  await prisma.image.create({ data: { url: uploadResult.secure_url, uploadedById: c.get("user").id } });

  return c.json({ message: "Image uploaded" });
});

// Get Random Image
app.get("/images/random", authMiddleware, async (c) => {
  const image = await prisma.image.findFirst({ orderBy: { createdAt: "desc" } });
  return c.json(image);
});

// Rate Image
app.post("/images/rate/:id", authMiddleware, async (c) => {
  const { id } = c.req.param();
  const { score } = await c.req.json();

  if (![1, -1].includes(score)) {
    return c.json({ error: "Invalid rating value, must be 1 or -1" }, 400);
  }

  await prisma.rating.create({
    data: {
      userId: c.get("user").id,
      imageId: id,
      score,
    },
  });

  return c.json({ message: "Rated successfully" });
});

// Get Median Score
app.get("/images/median", authMiddleware, async (c) => {
  const ratings = await prisma.rating.findMany();
  const scores = ratings.map((r) => r.score).sort((a, b) => a - b);

  const median =
    scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];

  return c.json({ median });
});

export default app;
