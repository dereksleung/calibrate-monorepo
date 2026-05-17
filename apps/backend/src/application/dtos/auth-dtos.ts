import { User } from "@domain";

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResultDto {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}
