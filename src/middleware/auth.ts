import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone: string;
        role: string;
      };
    }
  }
}

export const authenticate = (
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
    req.user = {
      userId: payload.userId,
      phone: payload.phone,
      role: payload.role,
    };
    next();
  } catch {
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
