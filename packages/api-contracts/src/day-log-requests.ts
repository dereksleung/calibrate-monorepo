import * as z from "zod";

export const GetDayLogRequestRouteParamsSchema = z.object({
  date: z.iso.date(),
});

export type GetDayLogRequestRouteParams = z.infer<typeof GetDayLogRequestRouteParamsSchema>;

export const UpdateDayLogWeightRequestRouteParamsSchema = z.object({
  date: z.iso.date(),
});

export const UpdateDayLogWeightRequestBodySchema = z.object({
  weight: z.number().positive("Weight must be greater than 0").max(9999.9, "Weight is too large"),
});

export type UpdateDayLogWeightRequestRouteParams = z.infer<typeof UpdateDayLogWeightRequestRouteParamsSchema>;
export type UpdateDayLogWeightRequestBody = z.infer<typeof UpdateDayLogWeightRequestBodySchema>;
