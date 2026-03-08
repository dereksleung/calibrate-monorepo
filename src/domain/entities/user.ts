import { UserTier, UserTierEnumType, UserTierSchema } from "../value-objects/user-tier.js";

import argon2 from "argon2";

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  tier: UserTierEnumType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  email: string;
  passwordHash: string;
}

export class User {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _passwordHash: string;
  private readonly _tier: UserTier;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor({ id, email, passwordHash, tier, createdAt, updatedAt }: UserProps) {
    this._id = id;
    this._email = email;
    this._passwordHash = passwordHash;
    this._tier = UserTier.from(tier);
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public static reconstitute(props: UserProps): User {
    return new User(props);
  }
  public static create(props: CreateUserProps): User {
    return new User({
      id: crypto.randomUUID(),
      email: props.email,
      passwordHash: props.passwordHash,
      tier: UserTierSchema.enum.FREE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public get id(): string {
    return this._id;
  }
  public get email(): string {
    return this._email;
  }
  public get passwordHash(): string {
    return this._passwordHash;
  }
  public get tier(): UserTier {
    return this._tier;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
      type: argon2.argon2id,
    });
  }
}
