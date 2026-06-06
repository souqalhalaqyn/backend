import { Router } from "express";
import * as CategoryController from "../controllers/CategoryController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", CategoryController.getAll);
router.get("/:id", CategoryController.getById);
router.get("/:id/containers", CategoryController.getContainers);
router.post("/", authenticate, requireAdmin, CategoryController.create);
router.put("/:id", authenticate, requireAdmin, CategoryController.update);
router.delete("/:id", authenticate, requireAdmin, CategoryController.remove);

export default router;