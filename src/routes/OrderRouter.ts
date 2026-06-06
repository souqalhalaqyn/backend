import { Router } from "express";
import * as OrderController from "../controllers/OrderController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, OrderController.getMyOrders);
router.post("/", authenticate, OrderController.placeOrder);
router.get("/:id", authenticate, OrderController.getOrderById);
router.post("/:id/cancel", authenticate, OrderController.cancelOrder);

export default router;
