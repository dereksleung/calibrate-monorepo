import * as z from "zod";

export const MealNameSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]);

export const MealNameEnum = MealNameSchema.enum;

export type MealNameEnumType = z.infer<typeof MealNameSchema>;

export interface CommonFoodEntryProps {
  id: string;
  dayLogId: string;
  meal: MealNameEnumType;
  name: string;
  brand: string | null;
  iconName: string | null;
  chosenQuantity: number;
  chosenUnit: string;
  quantityServing: number;
  servingLabel: string;
  quantityMass: number | null;
  massUnit: string | null;
  quantityVolume: number | null;
  volumeUnit: string | null;
  calories: number;
  totalFatGrams: number;
  saturatedFatGrams: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbohydrateGrams: number;
  fiberGrams: number | null;
  sugarGrams: number | null;
  proteinGrams: number;
}

export type FoodEntryProps = CommonFoodEntryProps;

export type CreateFoodEntryProps = Omit<FoodEntryProps, "id">;

export class FoodEntry {
  private readonly _id: string;
  private readonly _dayLogId: string;
  private readonly _meal: MealNameEnumType;
  private _name: string;
  private _brand: string | null;
  private _iconName: string | null;
  private _chosenQuantity: number;
  private _chosenUnit: string;
  private _quantityServing: number;
  private _servingLabel: string;
  private _quantityMass: number | null;
  private _massUnit: string | null;
  private _quantityVolume: number | null;
  private _volumeUnit: string | null;
  private _calories: number;
  private _totalFatGrams: number;
  private _saturatedFatGrams: number | null;
  private _cholesterolMg: number | null;
  private _sodiumMg: number | null;
  private _totalCarbohydrateGrams: number;
  private _fiberGrams: number | null;
  private _sugarGrams: number | null;
  private _proteinGrams: number;

  private constructor({
    id,
    meal,
    name,
    brand,
    iconName,
    chosenQuantity,
    chosenUnit,
    quantityServing,
    servingLabel,
    quantityMass,
    massUnit,
    quantityVolume,
    volumeUnit,
    calories,
    totalFatGrams,
    saturatedFatGrams,
    cholesterolMg,
    sodiumMg,
    totalCarbohydrateGrams,
    fiberGrams,
    sugarGrams,
    proteinGrams,
    dayLogId,
  }: FoodEntryProps) {
    this._id = id;
    this._dayLogId = dayLogId;
    this._meal = meal;
    this._name = name;
    this._brand = brand;
    this._iconName = iconName;
    this._chosenQuantity = chosenQuantity;
    this._chosenUnit = chosenUnit;
    this._quantityServing = quantityServing;
    this._servingLabel = servingLabel;
    this._quantityMass = quantityMass;
    this._massUnit = massUnit;
    this._quantityVolume = quantityVolume;
    this._volumeUnit = volumeUnit;
    this._calories = calories;
    this._totalFatGrams = totalFatGrams;
    this._saturatedFatGrams = saturatedFatGrams;
    this._cholesterolMg = cholesterolMg;
    this._sodiumMg = sodiumMg;
    this._totalCarbohydrateGrams = totalCarbohydrateGrams;
    this._fiberGrams = fiberGrams;
    this._sugarGrams = sugarGrams;
    this._proteinGrams = proteinGrams;
  }

  public static reconstitute(props: FoodEntryProps): FoodEntry {
    return new FoodEntry(props);
  }

  public static create(props: CreateFoodEntryProps): FoodEntry {
    return new FoodEntry({
      ...props,
      id: crypto.randomUUID(),
    });
  }

  public get id(): string {
    return this._id;
  }
  public get dayLogId(): string {
    return this._dayLogId;
  }
  public get meal(): MealNameEnumType {
    return this._meal;
  }
  public get name(): string {
    return this._name;
  }
  public get brand(): string | null {
    return this._brand;
  }
  public get iconName(): string | null {
    return this._iconName;
  }
  public get chosenQuantity(): number {
    return this._chosenQuantity;
  }
  public get chosenUnit(): string {
    return this._chosenUnit;
  }
  public get quantityServing(): number {
    return this._quantityServing;
  }
  public get servingLabel(): string {
    return this._servingLabel;
  }
  public get quantityMass(): number | null {
    return this._quantityMass;
  }
  public get massUnit(): string | null {
    return this._massUnit;
  }
  public get quantityVolume(): number | null {
    return this._quantityVolume;
  }
  public get volumeUnit(): string | null {
    return this._volumeUnit;
  }
  public get calories(): number {
    return this._calories;
  }
  public get totalFatGrams(): number {
    return this._totalFatGrams;
  }
  public get saturatedFatGrams(): number | null {
    return this._saturatedFatGrams;
  }
  public get cholesterolMg(): number | null {
    return this._cholesterolMg;
  }
  public get sodiumMg(): number | null {
    return this._sodiumMg;
  }
  public get totalCarbohydrateGrams(): number {
    return this._totalCarbohydrateGrams;
  }
  public get fiberGrams(): number | null {
    return this._fiberGrams;
  }
  public get sugarGrams(): number | null {
    return this._sugarGrams;
  }
  public get proteinGrams(): number {
    return this._proteinGrams;
  }
}
