import type { NextFunction, Request, Response } from "express";

/**
 * Reads Accept-Language header and sets req.lang to "en" or "ar".
 * Defaults to "en" if header is missing or unrecognized.
 */
declare global {
  namespace Express {
    interface Request {
      lang: "en" | "ar";
    }
  }
}

export function languageMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers["accept-language"];
  if (header === "ar" || header?.startsWith("ar")) {
    req.lang = "ar";
  } else {
    req.lang = "en";
  }
  next();
}
