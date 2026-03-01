import * as z from "zod";

export const GetDayLogRequestRouteParamsSchema = z.object({
  date: z.iso.date(),
});

export type GetDayLogRequestRouteParams = z.infer<
  typeof GetDayLogRequestRouteParamsSchema
>;
