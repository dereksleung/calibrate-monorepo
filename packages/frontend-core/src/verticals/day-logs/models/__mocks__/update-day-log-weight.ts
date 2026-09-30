import type {
  UpdateDayLogWeightAcknowledgement,
  UpdateDayLogWeightCommand,
} from "../update-day-log-weight.js";

export function buildUpdateDayLogWeightCommand(
  overrides: Partial<UpdateDayLogWeightCommand> = {},
): UpdateDayLogWeightCommand {
  return { weight: 182.5, ...overrides };
}

export function buildUpdateDayLogWeightAcknowledgement(
  overrides: Partial<UpdateDayLogWeightAcknowledgement> = {},
): UpdateDayLogWeightAcknowledgement {
  return {
    updatedWeight: 182.5,
    versionNumber: 2,
    ...overrides,
  };
}
