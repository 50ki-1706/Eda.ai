import { auth } from "@/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const authMiddleware = t.middleware(async (opts) => {
  try {
    const session = await auth.api.getSession({
      headers: opts.ctx.req.headers,
    });

    if (!session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "ログインしてください。",
      });
    }

    return opts.next({
      ctx: {
        ...opts.ctx,
        user: session.user,
      },
    });
  } catch (error) {
    console.error("Auth middleware error:", error);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証に失敗しました。",
    });
  }
});
