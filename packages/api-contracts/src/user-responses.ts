import * as z from "zod";

const UserTierSchema = z.enum(["FREE", "PREMIUM", "LIFETIME"]);

export type UserTierEnumType = z.infer<typeof UserTierSchema>;

export interface UserResponse {
  id: string;
  email: string;
  tier: UserTierEnumType;
  createdAt: Date;
  updatedAt: Date;
}
