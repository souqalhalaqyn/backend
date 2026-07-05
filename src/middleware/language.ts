import type { NextFunction, Request, Response } from "express";

/**
 * Reads Accept-Language header and sets req.lang to "ar" or "en".
 * Defaults to "ar" if header is missing or unrecognized.
 * Only switches to "en" when explicitly sent Accept-Language: en.
 * When x-app: admin header is present, sets req.isAdminRequest = true
 * so the backend returns raw bilingual fields instead of localized ones.
 */
declare global {
  namespace Express {
    interface Request {
      lang: "ar" | "en";
      isAdminRequest?: boolean;
    }
  }
}

export function languageMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.headers["x-app"] === "admin") {
    req.isAdminRequest = true;
  }
  const header = req.headers["accept-language"];
  if (header === "en" || header?.startsWith("en")) {
    req.lang = "en";
  } else {
    req.lang = "ar";
  }
  next();
}
