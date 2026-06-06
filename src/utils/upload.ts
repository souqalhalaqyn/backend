import multer from "multer";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { ENV } from "../config/env.js";

if (!existsSync(ENV.UPLOADS_DIR)) mkdirSync(ENV.UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ENV.UPLOADS_DIR),
  filename: (req, file, cb) => {
    const prefix = (req.body?.prefix as string) || "general";
    const ext = path.extname(file.originalname);
    const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`unsupported image type: ${file.mimetype}`));
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
