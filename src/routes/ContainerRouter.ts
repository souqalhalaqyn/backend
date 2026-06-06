import { Router } from "express";
import * as ContainerController from "../controllers/ContainerController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", ContainerController.getAll);
router.get("/:id", ContainerController.getById);
router.post("/", authenticate, requireAdmin, ContainerController.create);
router.put("/:id", authenticate, requireAdmin, ContainerController.update);
router.delete("/:id", authenticate, requireAdmin, ContainerController.remove);
router.post("/:productId/images", authenticate, requireAdmin, ContainerController.addProductImage);
router.delete("/:productId/images/:imageIndex", authenticate, requireAdmin, ContainerController.removeProductImage);

export default router;