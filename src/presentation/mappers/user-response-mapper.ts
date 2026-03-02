import { User } from "@domain";
import { UserResponse } from "../http/user-responses.js";

export class UserResponseMapper {
  public static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      tier: user.tier.value,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
