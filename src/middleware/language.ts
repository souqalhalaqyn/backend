import type { NextFunction, Request, Response } from "express";

/**
 * Reads Accept-Language header and sets req.lang to "en" or "ar".
 * Defaults to "en" if header is missing or unrecognized.
 * When x-app: admin header is present, sets req.isAdminRequest = true
 * so the backend returns raw bilingual fields instead of localized ones.
 */
declare global {
  namespace Express {
    interface Request {
      lang: "en" | "ar";
      isAdminRequest?: boolean;
    }
  }
}

export function languageMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.headers["x-app"] === "admin") {
    req.isAdminRequest = true;
  }
  const header = req.headers["accept-language"];
  if (header === "ar" || header?.startsWith("ar")) {
    req.lang = "ar";
  } else {
    req.lang = "en";
  }
  next();
}
