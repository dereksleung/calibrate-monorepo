import { MealNameEnumType } from "@domain";

// Repository DTOs
export interface GetDayLogByDateAndUserDto {
  userId: string;
  date: string;
}

export interface FindOrCreateDayLogByIdRepositoryDto {
  id: string | null;
  userId: string;
}
// Service layer DTOs for client inputs
export interface GetDayLogRequestDto {
  userId: string;
  date: string;
}

export interface AddFoodEntryRequestDto {
  userId: string;
  dayLogId: string;
  foodEntry: {
    meal: MealNameEnumType;
    name: string;
    brand: string | null;
    iconName: string | null;
    quantity: number;
    quantityUnit: string;
    calories: number;
    totalFatGrams: number;
    saturatedFatGrams: number | null;
    cholesterolMg: number | null;
    sodiumMg: number | null;
    totalCarbohydrateGrams: number;
    fiberGrams: number | null;
    sugarGrams: number | null;
    proteinGrams: number;
  };
}

// Cross-service DTOs for client inputs, if any
