import { Router } from "express";
import * as AdController from "../controllers/AdController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", AdController.getApprovedAds);
router.get("/:id", AdController.getAdById);
router.post("/", authenticate, AdController.createAdRequest);
router.get("/history/mine", authenticate, AdController.getUserAdHistory);

export default router;
