import { Router } from "express";
import * as BrandController from "../controllers/BrandController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", BrandController.getAll);
router.get("/:id", BrandController.getById);
router.post("/", authenticate, requireAdmin, BrandController.create);
router.put("/:id", authenticate, requireAdmin, BrandController.update);
router.delete("/:id", authenticate, requireAdmin, BrandController.remove);

export default router;