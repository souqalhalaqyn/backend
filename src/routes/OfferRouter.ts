import { Router } from "express";
import * as OfferController from "../controllers/OfferController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public
router.get("/", OfferController.getAvailable);
router.get("/mine", authenticate, OfferController.getMyOffer);
router.get("/:id", OfferController.getById);
router.post("/:id/buy", authenticate, OfferController.buyOffer);

// Admin
router.get("/admin/all", authenticate, requireAdmin, OfferController.getAll);
router.get("/admin/:id", authenticate, requireAdmin, OfferController.getByIdAdmin);
router.post("/admin", authenticate, requireAdmin, OfferController.create);
router.put("/admin/:id", authenticate, requireAdmin, OfferController.update);
router.delete("/admin/:id", authenticate, requireAdmin, OfferController.remove);

export default router;
