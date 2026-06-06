import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export interface TokenPayload {
  userId: string;
  phone: string;
  role: string;
  tokenVersion?: number;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, type: "access" }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, tokenVersion: payload.tokenVersion ?? 0, type: "refresh" },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any },
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as TokenPayload;
}
