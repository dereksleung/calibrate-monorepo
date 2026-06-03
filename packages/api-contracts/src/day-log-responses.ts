import * as z from 'zod';
import { FoodEntryResponseSchema } from './food-entry-responses.js';

export const DayLogResponseSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
  breakfast: z.array(FoodEntryResponseSchema).nullable(),
  lunch: z.array(FoodEntryResponseSchema).nullable(),
  dinner: z.array(FoodEntryResponseSchema).nullable(),
  snacks: z.array(FoodEntryResponseSchema).nullable(),
  weight: z.number().positive().max(9999.9).nullable(),
}).nullable();

export type DayLogResponse = z.infer<typeof DayLogResponseSchema>;
