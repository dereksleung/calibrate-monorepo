import * as z from "zod";

import { FoodEntryBaseSchema } from "./common/food-entry-base.js";

const FoodSearchResultBaseSchema = FoodEntryBaseSchema.extend({
  sourceLabel: z.string().min(1),
});

export const RecentFoodRecencyMetadataSchema = z.object({
  lastUsedDate: z.iso.date(),
  displayLabel: z.string().min(1).max(12),
});

export const RecentFoodSearchResultSchema = FoodSearchResultBaseSchema.extend({
  source: z.literal("recent"),
  foodEntryId: z.string().min(1),
  recency: RecentFoodRecencyMetadataSchema,
});

export const UsdaFoodSearchResultSchema = FoodSearchResultBaseSchema.extend({
  source: z.literal("usda"),
  fdcId: z.number().int().positive(),
});

export const FoodSearchResultSchema = z.discriminatedUnion("source", [
  RecentFoodSearchResultSchema,
  UsdaFoodSearchResultSchema,
]);

export const FoodSearchResponseSchema = z.object({
  results: z.array(FoodSearchResultSchema),
});

export const RecentFoodsResponseSchema = z.object({
  results: z.array(RecentFoodSearchResultSchema),
});

export type RecentFoodRecencyMetadata = z.infer<typeof RecentFoodRecencyMetadataSchema>;
export type RecentFoodSearchResult = z.infer<typeof RecentFoodSearchResultSchema>;
export type UsdaFoodSearchResult = z.infer<typeof UsdaFoodSearchResultSchema>;
export type FoodSearchResult = z.infer<typeof FoodSearchResultSchema>;
export type FoodSearchResponse = z.infer<typeof FoodSearchResponseSchema>;
export type RecentFoodsResponse = z.infer<typeof RecentFoodsResponseSchema>;
