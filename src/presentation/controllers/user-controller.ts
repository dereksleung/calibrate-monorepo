import { handleControllerError } from "@common";
import { IUserService } from "@services";
import { validate } from "@validation";
import { CreateUserRequestBodySchema } from "../http/user-requests.js";
import { Request, Response } from "express";
import { UserResponseMapper } from "../mappers/user-response-mapper.js";
import { UserResponse } from "../http/user-responses.js";

export class UserController {
  private readonly userService: IUserService;
  constructor(userService: IUserService) {
    this.userService = userService;
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = validate(CreateUserRequestBodySchema, req.body);
      if (!validatedInput.isValid) {
        res.status(400).json({
          error: "Validation failed",
          details: validatedInput.errors,
        });
        return;
      }
      const user = await this.userService.createUser(validatedInput.data);
      const response: UserResponse = UserResponseMapper.toResponse(user);
      res.status(201).json(response);
    } catch (error) {
      handleControllerError(error, res);
    }
  }
}
