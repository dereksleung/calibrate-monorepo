import {
  GetDayLogRequestRouteParams,
  GetDayLogRequestRouteParamsSchema,
} from "../http/day-log-requests.js";
import { DayLogResponse } from "../http/day-log-responses.js";
import { Request, Response } from "express";
import { DayLogService } from "@services";
import { validate } from "@validation";
import { DayLogResponseMapper } from "../mappers/day-log-response-mapper.js";
import { BusinessLogicError } from "@domain";
import { handleControllerError } from "@common";

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
  private readonly dayLogService: DayLogService;
  constructor(dayLogService: DayLogService) {
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
      const userId = this.extractUserId(req);
      const dayLog = await this.dayLogService.getLogForDay({
        userId,
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

  private extractUserId(req: Request): string {
    return (
      (req.get("user-id") as string) || "6ebcfbaf-50ad-44c9-bd8f-81965641b458"
    );
  }
}
