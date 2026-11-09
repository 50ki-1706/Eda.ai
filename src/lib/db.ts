import "server-only";
import postgres from "postgres";

// next dev がモジュールを再評価してもコネクションプールを1つに保つ
const globalForPostgres = globalThis as unknown as {
  postgres?: postgres.Sql;
};

export const db =
  globalForPostgres.postgres ??
  postgres(
    process.env.DATABASE_URL ?? "postgresql://root:root@localhost:5432/db",
  );

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgres = db;
}
