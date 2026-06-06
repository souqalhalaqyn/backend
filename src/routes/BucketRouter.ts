import { Router } from "express";
import * as BucketController from "../controllers/BucketController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, BucketController.getMyBalance);
router.post("/add", authenticate, requireAdmin, BucketController.addFunds);

export default router;
