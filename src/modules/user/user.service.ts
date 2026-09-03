import { cloudinary } from "../../config/cloudinary";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const updateMe = async (
  userId: string,
  data: { name?: string; phone?: string; address?: string },
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });
  return user;
};

export const uploadAvatar = async (
  userId: string,
  fileBuffer: Buffer,
  mimetype: string,
) => {
  // Upload to Cloudinary using a stream from the memory buffer
  const uploadResult = await new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "ambulance-dispatch/avatars",
        public_id: `user_${userId}`,
        overwrite: true,
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("Upload failed"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(fileBuffer);
  });

  // Save the URL to the user record
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: uploadResult.secure_url },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });

  return user;
};
