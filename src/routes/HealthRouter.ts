import { Router } from "express";
import { responder } from "../utils/Responder.js";

const router = Router();

router.get("/", (_req, res) => {
  return responder()
    .message("API is healthy")
    .payload({ service: "barbers-api" })
    .send(res);
});

export default router;
