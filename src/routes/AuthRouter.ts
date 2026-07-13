import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as AuthController from "../controllers/AuthController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, status: 429, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", authLimiter, AuthController.signup);
router.post("/login", authLimiter, AuthController.login);
router.post("/refresh", authLimiter, AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);
router.post("/change-password", authenticate, AuthController.changeMyPassword);
router.post("/register-push-token", authenticate, AuthController.registerPushToken);
router.post("/register-admin-push-token", authenticate, AuthController.registerAdminPushToken);
router.put("/name", authenticate, AuthController.updateName);

// -- Locations --
router.get("/locations", authenticate, AuthController.getLocations);
router.post("/locations", authenticate, AuthController.addLocation);
router.put("/locations/default", authenticate, AuthController.setDefaultLocation);
router.put("/locations/:name", authenticate, AuthController.updateLocation);
router.delete("/locations/:name", authenticate, AuthController.deleteLocation);

export default router;