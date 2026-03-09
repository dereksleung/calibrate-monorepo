import { BusinessLogicError } from "@domain";
import { Response } from "express";

export function handleControllerError(error: unknown, res: Response): void {
  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    if (error.message.includes("permission")) {
      res.status(403).json({ error: "Permission denied" });
      return;
    }
    if (error instanceof BusinessLogicError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  } else {
    res.status(500).json({ error: "An unknown error occurred" });
  }
}
