import type { Container } from "@infrastructure/container.js";

import { getRuntimeEnvironmentValue } from "@infrastructure/runtime-environment.js";
import { createAuthenticationMiddleware } from "@presentation/middleware/auth-middleware.js";
import { createAuthRoutes } from "@routes/auth-routes.js";
import { createDayLogRoutes } from "@routes/day-log-routes.js";
import { createFoodSearchRoutes } from "@routes/food-search-routes.js";
import { createUserRoutes } from "@routes/user-routes.js";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

export function createHttpApp(container: Container): Express {
  const app = express();

  app.set("trust proxy", container.getTrustProxyHops());
  app.use(helmet());
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? false
          : (getRuntimeEnvironmentValue("CORS_ORIGIN") ?? "http://localhost:3000"),
      credentials: true,
    }),
  );
  app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));
  app.use(express.json());

  const authenticateRequest = createAuthenticationMiddleware(
    container.getAccessTokenService(),
    container.getAccessSessionRepository(),
    container.getClock(),
  );

  app.use("/api/v1", createAuthRoutes(container.getAuthController()));
  app.use("/api/v1", createDayLogRoutes(container.getDayLogController(), authenticateRequest));
  app.use("/api/v1", createFoodSearchRoutes(container.getFoodSearchController(), authenticateRequest));
  app.use("/api/v1", createUserRoutes(container.getUserController()));

  app.get("/health", (_req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  return app;
}
