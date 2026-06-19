import { Router } from "express";
import { categoryCrud, getAll, getById, getContainers } from "../controllers/CategoryController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);
router.get("/:id/containers", getContainers);
router.post("/", authenticate, requireAdmin, categoryCrud.create);
router.put("/:id", authenticate, requireAdmin, categoryCrud.update);
router.delete("/:id", authenticate, requireAdmin, categoryCrud.remove);

export default router;
