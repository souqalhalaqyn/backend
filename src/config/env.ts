import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { AppError } from "../errors/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "../../.env") });

const profile = process.env.PROFILE || "dev";

if (!["dev", "qa", "prod"].includes(profile))
  throw new AppError(`unknown profile ${profile}`);

const publicPath = path.resolve(
  __dirname,
  "../" + (process.env.PUBLIC_DIR || "public"),
);

const uploadsPath = path.resolve(
  __dirname,
  "../" + (process.env.UPLOADS_DIR || "uploads"),
);

export const ENV = {
  PROFILE: profile,
  PUBLIC: publicPath,
  UPLOADS_DIR: uploadsPath,
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || "localhost",
  PROTOCOL: process.env.PROTOCOL || "http",
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/barbers",
  JWT_SECRET: process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "dev-jwt-refresh-secret-change-in-production",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  ADMIN_PHONE: process.env.ADMIN_PHONE || "0000000000",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
};
