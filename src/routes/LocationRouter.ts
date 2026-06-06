import { Router } from "express";
import * as LocationController from "../controllers/LocationController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public endpoints
router.get("/states", LocationController.getStates);
router.get("/states/:stateId/regions", LocationController.getRegions);
router.get("/regions/:regionId/ways", LocationController.getWays);
router.get("/tree", LocationController.getLocationTree);

// Admin CRUD
router.post("/states", authenticate, requireAdmin, LocationController.createState);
router.put("/states/:id", authenticate, requireAdmin, LocationController.updateState);
router.delete("/states/:id", authenticate, requireAdmin, LocationController.deleteState);

router.post("/regions", authenticate, requireAdmin, LocationController.createRegion);
router.put("/regions/:id", authenticate, requireAdmin, LocationController.updateRegion);
router.delete("/regions/:id", authenticate, requireAdmin, LocationController.deleteRegion);

router.post("/ways", authenticate, requireAdmin, LocationController.createWay);
router.put("/ways/:id", authenticate, requireAdmin, LocationController.updateWay);
router.delete("/ways/:id", authenticate, requireAdmin, LocationController.deleteWay);

export default router;