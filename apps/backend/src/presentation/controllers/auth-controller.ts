import { handleControllerError } from "@common";
import { IAuthService } from "@services";
import { validate } from "@validation";
import { Request, Response } from "express";

import { LoginRequestBodySchema, type LoginResponse } from "@calibrate/api-contracts";
import { UserResponseMapper } from "../mappers/user-response-mapper.js";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = validate(LoginRequestBodySchema, req.body);
      if (!validatedInput.isValid) {
        res.status(400).json({
          error: "Validation failed",
          details: validatedInput.errors,
        });
        return;
      }

      const loginResult = await this.authService.login(validatedInput.data);
      const response: LoginResponse = {
        accessToken: loginResult.accessToken,
        tokenType: "Bearer",
        expiresIn: loginResult.expiresInSeconds,
        user: UserResponseMapper.toResponse(loginResult.user),
      };

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res);
    }
  }
}
