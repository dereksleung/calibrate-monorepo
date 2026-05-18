import type { UserResponse } from "./user-responses.js";

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: UserResponse;
}
