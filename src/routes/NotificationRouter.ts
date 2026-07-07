import { Router } from "express";
import * as NotificationController from "../controllers/NotificationController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/send", authenticate, requireAdmin, NotificationController.sendNotification);

export default router;
