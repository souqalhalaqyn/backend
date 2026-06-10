import { Router } from "express";
import * as ChargeRequestController from "../controllers/ChargeRequestController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";

const router = Router();

router.get("/", authenticate, ChargeRequestController.getMyRequests);
router.post("/", authenticate, upload.single("image"), ChargeRequestController.createRequest);

router.get("/admin", authenticate, requireAdmin, ChargeRequestController.getAllRequests);
router.get("/admin/:id", authenticate, requireAdmin, ChargeRequestController.getRequestById);
router.put("/admin/:id/status", authenticate, requireAdmin, ChargeRequestController.updateRequestStatus);

export default router;
