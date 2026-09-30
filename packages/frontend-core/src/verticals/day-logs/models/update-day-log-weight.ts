export type UpdateDayLogWeightCommand = {
  weight: number;
};

export type UpdateDayLogWeightAcknowledgement = {
  updatedWeight: number;
  versionNumber: number;
  dayLogId?: string;
};
