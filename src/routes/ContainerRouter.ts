import { Router } from "express";
import { containerCrud, addProductImage, removeProductImage } from "../controllers/ContainerController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", containerCrud.getAll);
router.get("/:id", containerCrud.getById);
router.post("/", authenticate, requireAdmin, containerCrud.create);
router.put("/:id", authenticate, requireAdmin, containerCrud.update);
router.delete("/:id", authenticate, requireAdmin, containerCrud.remove);
router.post("/:productId/images", authenticate, requireAdmin, addProductImage);
router.delete("/:productId/images/:imageIndex", authenticate, requireAdmin, removeProductImage);

export default router;
