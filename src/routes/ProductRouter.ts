import { Router } from "express";
import { productCrud, uploadImages } from "../controllers/ProductController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";

const router = Router();

router.get("/", productCrud.getAll);
router.get("/:id", productCrud.getById);
router.post("/", authenticate, requireAdmin, productCrud.create);
router.post("/upload", authenticate, requireAdmin, upload.array("images", 10), uploadImages);
router.put("/:id", authenticate, requireAdmin, productCrud.update);
router.delete("/:id", authenticate, requireAdmin, productCrud.remove);

export default router;
