import { UserTierEnumType } from "@domain";

export interface UserResponse {
  id: string;
  email: string;
  tier: UserTierEnumType;
  createdAt: Date;
  updatedAt: Date;
}
