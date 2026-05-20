import * as z from "zod";

export const FoodSearchRequestQuerySchema = z.object({
  query: z.string().trim().min(1, "Search query is required").max(100, "Search query is too long"),
});

export type FoodSearchRequestQuery = z.infer<typeof FoodSearchRequestQuerySchema>;
