import argon2 from "argon2";
import { IPasswordHasher } from "@application";

export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
      type: argon2.argon2id,
    });
  }
}
