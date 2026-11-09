import { os, ORPCError } from "@orpc/server";
import type { ORPCContext } from "./context";

/** 認証済みユーザー（getUserInfo が非 null を返した状態） */
export type AuthenticatedUser = NonNullable<ORPCContext["user"]>;

/**
 * 認証ミドルウェア
 *
 * 未ログインの場合は UNAUTHORIZED を返し、
 * 以降のハンドラーでは context.user が必ず存在する状態になる。
 *
 * コントラクト由来の型（入力・出力・メタ情報）を保つため、
 * `os` ではなく `implement(contract)` 側で `.use()` して適用する。
 */
export const authMiddleware = os
  .$context<ORPCContext>()
  .middleware(async ({ context, next }) => {
    if (!context.user) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "ログインしてください。",
      });
    }

    return next({ context: { user: context.user } });
  });
