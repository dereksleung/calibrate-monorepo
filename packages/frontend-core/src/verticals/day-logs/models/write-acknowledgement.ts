export type DayLogWriteAcknowledgement = {
  versionNumber: number;
  createdDayLogId?: string;
};

export type FoodEntryWriteAcknowledgement = DayLogWriteAcknowledgement & {
  foodEntryId: string;
};

export type WeightWriteAcknowledgement = DayLogWriteAcknowledgement;
