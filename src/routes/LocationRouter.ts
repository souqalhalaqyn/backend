import { Router } from "express";
import {
  stateCrud,
  wayCrud,
  branchCrud,
  getStates,
  getWaysByState,
  getBranchesByWay,
  getLocationTree,
} from "../controllers/LocationController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Public endpoints
router.get("/states", getStates);
router.get("/states/:stateId/ways", getWaysByState);
router.get("/ways/:wayId/branches", getBranchesByWay);
router.get("/tree", getLocationTree);

// Admin CRUD - States
router.post("/states", authenticate, requireAdmin, stateCrud.create);
router.put("/states/:id", authenticate, requireAdmin, stateCrud.update);
router.delete("/states/:id", authenticate, requireAdmin, stateCrud.remove);

// Admin CRUD - Ways
router.post("/ways", authenticate, requireAdmin, wayCrud.create);
router.put("/ways/:id", authenticate, requireAdmin, wayCrud.update);
router.delete("/ways/:id", authenticate, requireAdmin, wayCrud.remove);

// Admin CRUD - Branches
router.post("/branches", authenticate, requireAdmin, branchCrud.create);
router.put("/branches/:id", authenticate, requireAdmin, branchCrud.update);
router.delete("/branches/:id", authenticate, requireAdmin, branchCrud.remove);

export default router;
