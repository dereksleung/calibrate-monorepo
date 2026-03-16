import { Container } from "@infrastructure";
import { createAuthenticationMiddleware } from "@presentation";
import { createAuthRoutes, createDayLogRoutes, createUserRoutes } from "@routes";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

const container = new Container({});
const authenticateRequest = createAuthenticationMiddleware(container.getAccessTokenService());

// Routes
app.use("/api/v1", createAuthRoutes(container.getAuthController()));
app.use("/api/v1", createDayLogRoutes(container.getDayLogController(), authenticateRequest));
app.use("/api/v1", createUserRoutes(container.getUserController()));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
export default app;
