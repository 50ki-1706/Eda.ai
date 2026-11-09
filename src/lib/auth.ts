// Better Auth: PostgreSQL（kysely + node-postgres）アダプター構成
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { betterAuth } from "better-auth";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

// Better Auth 用テーブルの型定義（snake_case カラム）
type AuthDatabase = {
  user: {
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
    image: string | null;
    created_at: Date;
    updated_at: Date;
  };
  session: {
    id: string;
    expires_at: Date;
    token: string;
    created_at: Date;
    updated_at: Date;
    ip_address: string | null;
    user_agent: string | null;
    user_id: string;
  };
  account: {
    id: string;
    account_id: string;
    provider_id: string;
    user_id: string;
    access_token: string | null;
    refresh_token: string | null;
    id_token: string | null;
    access_token_expires_at: Date | null;
    refresh_token_expires_at: Date | null;
    scope: string | null;
    password: string | null;
    created_at: Date;
    updated_at: Date;
  };
  verification: {
    id: string;
    identifier: string;
    value: string;
    expires_at: Date;
    created_at: Date | null;
    updated_at: Date | null;
  };
};

let pool: pg.Pool | null = null;
let authDb: Kysely<AuthDatabase> | null = null;

// next dev の再評価でもクライアントを1つに保つ
const globalForAuth = globalThis as unknown as {
  authPool?: pg.Pool;
  authKysely?: Kysely<AuthDatabase>;
};

/**
 * Better Auth 用の kysely クライアントを取得する
 * （アプリ本体のクエリは reylo を使うが、Better Auth は純正の kysely アダプターで接続する）
 */
const getAuthDatabase = (): Kysely<AuthDatabase> => {
  if (authDb) return authDb;

  pool =
    globalForAuth.authPool ??
    new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  if (process.env.NODE_ENV !== "production") globalForAuth.authPool = pool;

  authDb =
    globalForAuth.authKysely ??
    new Kysely<AuthDatabase>({
      dialect: new PostgresDialect({ pool }),
    });
  if (process.env.NODE_ENV !== "production") {
    globalForAuth.authKysely = authDb;
  }

  return authDb;
};

export const auth = betterAuth({
  database: kyselyAdapter(getAuthDatabase(), { type: "postgres" }),
  // DB カラムは snake_case なので、Better Auth のフィールド名を対応づける
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
  },
  account: {
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  // Google oauthを設定する
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
});
