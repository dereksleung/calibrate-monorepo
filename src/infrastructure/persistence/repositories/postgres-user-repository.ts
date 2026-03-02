import { IUserRepository } from "@application";
import { User } from "@domain";
import { db, SelectableUser } from "@infrastructure";

export class PostgresUserRepository implements IUserRepository {
  async save(user: User): Promise<User> {
    const userRow = await db
      .insertInto("users")
      .values({
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        tier: user.tier.value,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      })
      .returningAll()
      .executeTakeFirst();

    if (!userRow) {
      throw new Error("Failed to create user");
    }

    return this.mapRowToUser(userRow);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userRow = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    if (!userRow) return null;

    return this.mapRowToUser(userRow);
  }

  private mapRowToUser(userRow: SelectableUser): User {
    return User.reconstitute({
      id: userRow.id,
      email: userRow.email,
      passwordHash: userRow.password_hash,
      tier: userRow.tier,
      createdAt: new Date(userRow.created_at),
      updatedAt: new Date(userRow.updated_at),
    });
  }
}
