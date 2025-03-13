import { Hono } from "hono";
import bcrypt from "bcrypt";
import { cloudinary } from "./cloudinary.js";
import { requireAuth, requireAdmin } from "./middleware/auth.middleware.js";
import prisma from "./utils/prisma.js";
import { signToken } from "./utils/jwt.js";

const app = new Hono();

app.post("/auth/register", async (c) => {
  const { username, password } = await c.req.json();
  
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    return c.json({ error: "Username already taken" }, 400);
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({ 
    data: { 
      username, 
      password: hashedPassword, 
      role: "PLAYER" 
    } 
  });
  
  return c.json({ 
    message: "User registered successfully", 
    userId: user.id 
  });
});

app.post("/auth/login", async (c) => {
  const { username, password } = await c.req.json();
  const user = await prisma.user.findUnique({ where: { username } });
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = signToken({ userId: user.id, role: user.role });
  
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), 
    }
  });
  
  await prisma.log.create({
    data: {
      userId: user.id,
      action: "LOGIN",
      details: "User logged in successfully"
    }
  });
  
  return c.json({ token, userId: user.id, role: user.role });
});

app.post("/admin/upload", requireAuth, requireAdmin, async (c) => {
  const body = await c.req.formData();
  const file = body.get("file") as File;
  const prompt = body.get("prompt") as string;
  
  if (!file) return c.json({ error: "No file uploaded" }, 400);
  if (!prompt) return c.json({ error: "Prompt is required" }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const base64Image = buffer.toString('base64');
  const dataURI = `data:${file.type};base64,${base64Image}`;

  try {
    const uploadResult = await cloudinary.uploader.upload(dataURI);
    
    const image = await prisma.image.create({ 
      data: { 
        url: uploadResult.secure_url,
        prompt,
        uploadedById: String(c.user!.id)
      } 
    });

    await prisma.log.create({
      data: {
        userId: String(c.user!.id),
        action: "UPLOAD_IMAGE",
        details: `Image uploaded: ${image.id}`
      }
    });

    return c.json({ message: "Image uploaded", image });
  } catch (error: any) {
    return c.json({ error: error.message || "Upload failed" }, 500);
  }
});

app.get("/images/random", requireAuth, async (c) => {
  const images = await prisma.image.findMany({
    where: {
      ratings: {
        none: {
          userId: String(c.user!.id) 
        }
      }
    },
    take: 1,
    orderBy: {
      createdAt: "desc" 
    }
  });
  
  if (images.length === 0) {
    return c.json({ message: "No unrated images found" }, 404);
  }
  
  return c.json(images[0]);
});

app.post("/images/rate/:id", requireAuth, async (c) => {
  const { id } = c.req.param();
  const { score } = await c.req.json();

  if (![1, -1].includes(score)) {
    return c.json({ error: "Invalid rating value, must be 1 or -1" }, 400);
  }

  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) {
    return c.json({ error: "Image not found" }, 404);
  }

  try {
    const rating = await prisma.rating.upsert({
      where: {
        userId_imageId: {
          userId: String(c.user!.id),
          imageId: id
        }
      },
      update: { score },
      create: {
        userId: String(c.user!.id),
        imageId: id,
        score,
      }
    });

    await prisma.log.create({
      data: {
        userId: String(c.user!.id),
        action: "RATE_IMAGE",
        details: `Rated image ${id} with score ${score}`
      }
    });

    return c.json({ message: "Rated successfully", rating });
  } catch (error: any) {
    return c.json({ error: error.message || "Rating failed" }, 500);
  }
});

app.get("/images/median", requireAuth, async (c) => {
  const ratings = await prisma.rating.findMany();
  if (ratings.length === 0) {
    return c.json({ median: 0 });
  }
  
  const scores = ratings
  .map((r: { score: number }) => r.score)
  .sort((a: number, b: number) => a - b);
  
  const median =
    scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];

  return c.json({ median });
});

export default app;
