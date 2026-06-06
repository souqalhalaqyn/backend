import "./config/env.js";

import httpServer from "./app.js";
import { ENV } from "./config/env.js";
import { bootstrap } from "./bootstrap/index.js";

bootstrap().then(() => {
  httpServer.listen(ENV.PORT, () => {
    console.log(
      `🚀 [${ENV.PROFILE}] Server: ${ENV.PROTOCOL}://${ENV.HOST}:${ENV.PORT}`,
    );
  });
});
