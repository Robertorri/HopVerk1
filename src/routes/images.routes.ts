import { Hono } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { env } from "node:process";
import { encodeBase64 } from "hono/utils/encode";
import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/security.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import logger from "../utils/logger.js";

export const imageApi = new Hono();

const cloudinaryConfig = {
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
};

cloudinary.config(cloudinaryConfig);

const VALID_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

imageApi.post("/cloudinary", requireAuth, requireAdmin, async (c) => {
  try {
    const { file, name }: { file: File; name?: string } = await c.req.parseBody();
    
    if (!VALID_MIME_TYPES.includes(file.type)) {
      return c.json({ error: "Invalid file type. Einungis JPEG, PNG" }, 400);
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File too large. Maximum size is 5MB" }, 400);
    }
    
    const sanitizedName = name ? sanitizeInput(name) : undefined;
    
    const byteArrayBuffer = await file.arrayBuffer();
    const base64 = encodeBase64(byteArrayBuffer);

    const uploadResult = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64}`,
      { public_id: sanitizedName },
    );

    if (uploadResult) {
      await prisma.image.create({
        data: {
          url: uploadResult.url,
          prompt: sanitizedName || "Uploaded image",
          uploadedById: c.user!.id
        },
      });
      
      await logger.info("Image uploaded", c.user!.id, `Cloudinary image ID: ${uploadResult.public_id}`);
    }

    return c.json(uploadResult);
  } catch (error: any) {
    await logger.error("Image upload error", c.user?.id, error.message);
    return c.json({ error: error.message || "Upload failed" }, 500);
  }
});

imageApi.get("/all", async (c) => {
    try {
      const allImages = await prisma.image.findMany();
      return c.json(allImages.map((image: { url: string }) => image.url));
    } catch (error: any) {
      await logger.error("Error fetching images", undefined, error.message);
      return c.json({ error: "Failed to fetch images" }, 500);
    }
  });
  
