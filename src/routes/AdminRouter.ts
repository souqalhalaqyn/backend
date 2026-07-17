import { Router } from "express";
import * as AdController from "../controllers/AdController.js";
import * as AdminController from "../controllers/AdminController.js";
import * as OrderController from "../controllers/OrderController.js";
import { authenticate, requireAdmin, requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/settings", authenticate, requireAdmin, AdminController.getSettings);
router.put("/settings", authenticate, requireAdmin, AdminController.updateSettings);
router.post("/settings/slider", authenticate, requireAdmin, AdminController.addSliderImage);
router.put("/settings/slider/:index", authenticate, requireAdmin, AdminController.updateSliderImage);
router.delete("/settings/slider/:index", authenticate, requireAdmin, AdminController.removeSliderImage);

router.get("/orders", authenticate, requireAdmin, OrderController.getAllOrders);
router.get("/orders/:id", authenticate, requireAdmin, OrderController.getOrderById);
router.put(
  "/orders/:id/status",
  authenticate, requireAdmin,
  OrderController.updateOrderStatus,
);

router.get("/users", authenticate, requireAdmin, AdminController.getUsers);
router.get("/users/:id", authenticate, requireAdmin, AdminController.getUserById);
router.put("/users/:id/balance", authenticate, requireAdmin, AdminController.updateUserBalance);
router.put("/users/:id/block", authenticate, requireAdmin, AdminController.blockUser);
router.put("/users/:id/unblock", authenticate, requireAdmin, AdminController.unblockUser);
router.put("/users/:id/change-password", authenticate, requireAdmin, AdminController.changeUserPassword);
router.put("/users/:id/role", authenticate, requireSuperAdmin, AdminController.updateUserRole);

router.get("/ads", authenticate, requireAdmin, AdController.getAllAdRequests);
router.put("/ads/:id/approve", authenticate, requireAdmin, AdController.approveAdRequest);
router.put("/ads/:id/reject", authenticate, requireAdmin, AdController.rejectAdRequest);
router.put("/ads/:id", authenticate, requireAdmin, AdController.updateAdRequest);
router.delete("/ads/:id", authenticate, requireAdmin, AdController.deleteAd);

export default router;