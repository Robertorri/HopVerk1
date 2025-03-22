import { Hono } from "hono";
import { serve } from "@hono/node-server";
import bcrypt from "bcrypt";
import { cloudinary } from "./cloudinary.js";
import { requireAuth, requireAdmin } from "./middleware/auth.middleware.js";
import prisma from "./utils/prisma.js";
import { signToken } from "./utils/jwt.js";
import { sanitizeInput, isRateLimited } from "./utils/security.js";

const app = new Hono();

// Add security headers middleware
app.use('*', async (c, next) => {
  // Apply rate limiting
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();

  // Add security headers
  c.header('Content-Security-Policy', "default-src 'self'");
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), camera=()');
});

app.post("/auth/register", async (c) => {
  const { username, password } = await c.req.json();
  
  // Sanitize inputs
  const cleanUsername = sanitizeInput(username);
  
  const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUser) {
    return c.json({ error: "Username already taken" }, 400);
  }
  
  // Enforce stronger password policy
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
    return c.json({ error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" }, 400);
  }
  
  // Use higher cost factor for bcrypt (12+)
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.create({ 
    data: { 
      username: cleanUsername, 
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
  const id = c.req.param("id");
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

// Set the port (if not already set) and ensure process.env.PORT is defined
const port = Number(process.env.PORT || 3000);
process.env.PORT = port.toString();

// Start the server using the Node adapter. The callback receives AddressInfo.
serve(app, (info) => {
  console.log(`Server running on http://${info.address}:${info.port}`);
});

export default app;
