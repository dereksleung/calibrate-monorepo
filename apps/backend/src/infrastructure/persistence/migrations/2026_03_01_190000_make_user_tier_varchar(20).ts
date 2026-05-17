import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .alterColumn("tier", (col) => col.setDataType("varchar(20)"))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("users")
    .alterColumn("tier", (col) => col.setDataType("varchar(255)"))
    .execute();
}
