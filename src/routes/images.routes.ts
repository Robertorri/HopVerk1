import { Hono } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { env } from "node:process";
import { encodeBase64 } from "hono/utils/encode";
import { PrismaClient } from "@prisma/client";

export const imageApi = new Hono();
const prisma = new PrismaClient();

const cloudinaryConfig = {
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
};

cloudinary.config(cloudinaryConfig);

imageApi.post("/cloudinary", async (c) => {
  const { file, name }: { file: File; name?: string } = await c.req.parseBody();
  const byteArrayBuffer = await file.arrayBuffer();
  const base64 = encodeBase64(byteArrayBuffer);

  const uploadResult = await cloudinary.uploader.upload(
    `data:image/png;base64,${base64}`,
    { public_id: name },
  );
  console.log(uploadResult);

  if (uploadResult) {
    await prisma.images.create({
      data: {
        // name: name ?? uploadResult.public_id,
        url: uploadResult.url,
      },
    });
  }

  return c.json(uploadResult);
});

imageApi.get("/all", async (c) => {
  const allImages = await prisma.images.findMany();

  return c.json(allImages.map((image) => image.url));
});