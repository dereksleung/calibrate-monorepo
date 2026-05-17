import { AuthController } from "@controllers";
import { Router } from "express";

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.post("/auth/login", (req, res) => authController.login(req, res));
  return router;
}
