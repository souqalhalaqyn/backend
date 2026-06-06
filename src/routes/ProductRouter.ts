import { Router } from "express";
import * as ProductController from "../controllers/ProductController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";

const router = Router();

router.get("/", ProductController.getAll);
router.get("/:id", ProductController.getById);
router.post("/", authenticate, requireAdmin, ProductController.create);
router.post("/upload", authenticate, requireAdmin, upload.array("images", 10), ProductController.uploadImages);
router.put("/:id", authenticate, requireAdmin, ProductController.update);
router.delete("/:id", authenticate, requireAdmin, ProductController.remove);

export default router;