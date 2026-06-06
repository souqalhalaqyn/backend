import cors from "cors";
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { createServer } from "http";
import morgan from "morgan";
import { ENV } from "./config/env.js";
import { AppError } from "./errors/AppError.js";
import { languageMiddleware } from "./middleware/language.js";
import mainRouter from "./routes/IndexRouter.js";
import { responder } from "./utils/Responder.js";

const app: Application = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors());
if (ENV.PROFILE === "dev") app.use(morgan("dev"));
app.use(express.json());
app.use(languageMiddleware);
app.use("/uploads", express.static(ENV.UPLOADS_DIR));

app.use("/api/v1", mainRouter);

app.use((req, _res, next) => {
  next(new AppError(`Route '${req.originalUrl}' does not exist`, 404));
});

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  return responder().err(err).send(res);
});

export default httpServer;