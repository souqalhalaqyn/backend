import { Router } from "express";
import { brandController } from "../controllers/BrandController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", brandController.getAll);
router.get("/:id", brandController.getById);
router.post("/", authenticate, requireAdmin, brandController.create);
router.put("/:id", authenticate, requireAdmin, brandController.update);
router.delete("/:id", authenticate, requireAdmin, brandController.remove);

export default router;
