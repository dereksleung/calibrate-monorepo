import { handleControllerError } from "@common";
import { IDayLogService } from "@services";
import { validate } from "@validation";
import { Request, Response } from "express";

import {
  GetDayLogRequestRouteParams,
  GetDayLogRequestRouteParamsSchema,
} from "../http/day-log-requests.js";
import { DayLogResponse } from "../http/day-log-responses.js";
import { DayLogResponseMapper } from "../mappers/day-log-response-mapper.js";

/**
 * The controller has one main job - go between HTTP, and my application.
 * It should:
 * - Validate and sanitize input,
 * - Call the appropriate service, which will provide an interface for actions coordinating operations on aggregates/entities,
 * - Format the response,
 * - Handle errors related to HTTP.
 * It should not handle business logic, database access, or complex formatting.
 */

export class DayLogController {
  private readonly dayLogService: IDayLogService;
  constructor(dayLogService: IDayLogService) {
    this.dayLogService = dayLogService;
  }

  async getLogForDay(
    req: Request<GetDayLogRequestRouteParams>,
    res: Response,
  ): Promise<void> {
    try {
      const validatedInput = validate(
        GetDayLogRequestRouteParamsSchema,
        req.params,
      );
      if (!validatedInput.isValid) {
        res.status(400).json({
          error: "Validation failed",
          details: validatedInput.errors,
        });
        return;
      }
      // TODO: Remove this once we implement authentication with JWT
      const stubUserId = "59802894-b4ad-49dc-83dd-72a6fa571cd3";
      const dayLog = await this.dayLogService.getLogForDay({
        userId: stubUserId,
        date: validatedInput?.data.date,
      });

      const response: DayLogResponse | null = dayLog
        ? DayLogResponseMapper.toResponse(dayLog)
        : null;
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res);
    }
  }
}
