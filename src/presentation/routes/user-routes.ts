import { UserController } from "@controllers";
import { Router } from "express";

export function createUserRoutes(userController: UserController): Router {
  const router = Router();

  router.post("/users", (req, res) => userController.createUser(req, res));
  return router;
}
