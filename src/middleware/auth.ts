import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone: string;
        role: string;
        name?: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);

    // Verify token version matches current user version
    if (payload.tokenVersion != null) {
      const user = await User.findById(payload.userId)
        .select("refreshTokenVersion")
        .lean();
      if (!user || (payload.tokenVersion ?? 0) < user.refreshTokenVersion) {
        throw new AppError("Token has been revoked. Please login again.", 401);
      }
    }

    req.user = {
      userId: payload.userId,
      phone: payload.phone,
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Invalid or expired token", 401);
  }
};

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    throw new AppError("Admin access required", 403);
  }
  next();
};

export const requireSuperAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "super_admin") {
    throw new AppError("Super admin access required", 403);
  }
  next();
};
