import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Router } from "express";
import * as AdminController from "../controllers/AdminController.js";
import AdminRouter from "./AdminRouter.js";
import AssetsRouter from "./AssetRouter.js";
import AuthRouter from "./AuthRouter.js";
import BrandRouter from "./BrandRouter.js";
import BucketRouter from "./BucketRouter.js";
import ChargeRequestRouter from "./ChargeRequestRouter.js";
import OfferRouter from "./OfferRouter.js";
import CategoryRouter from "./CategoryRouter.js";
import ContainerRouter from "./ContainerRouter.js";
import HealthRouter from "./HealthRouter.js";
import LocationRouter from "./LocationRouter.js";
import OrderRouter from "./OrderRouter.js";
import ProductRouter from "./ProductRouter.js";
import SearchRouter from "./SearchRouter.js";
import { authenticate } from "../middleware/auth.js";
import AdRouter from "./AdRouter.js";
import NotificationRouter from "./NotificationRouter.js";
import { upload } from "../utils/upload.js";
import { AppError } from "../errors/AppError.js";
import { responder } from "../utils/Responder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appVersions = JSON.parse(readFileSync(resolve(__dirname, "../data/app-versions.json"), "utf-8"));

const router = Router();

router.get("/app-versions", (_req, res) => {
  return responder().code(200).message("app versions").payload(appVersions).send(res);
});

router.use("/admin", AdminRouter);
router.use("/assets", AssetsRouter);
router.use("/ads", AdRouter);
router.use("/auth", AuthRouter);
router.use("/bucket", BucketRouter);
router.use("/brands", BrandRouter);
router.use("/charge-requests", ChargeRequestRouter);
router.use("/categories", CategoryRouter);
router.use("/containers", ContainerRouter);
router.use("/health", HealthRouter);
router.use("/locations", LocationRouter);
router.use("/notifications", NotificationRouter);
router.use("/offers", OfferRouter);
router.use("/orders", OrderRouter);
router.use("/products", ProductRouter);
router.use("/search", SearchRouter);
router.get("/settings/slider", AdminController.getSliderImages);
router.get("/settings/exchange-rate", AdminController.getExchangeRate);

router.post("/upload", authenticate, upload.array("images", 10), (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw new AppError("no images provided", 400);
  const filenames = files.map((f) => f.filename);
  return responder().code(201).message("images uploaded").payload(filenames).send(res);
});

export default router;
