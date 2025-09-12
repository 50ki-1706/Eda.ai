import { auth } from "@/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const authMiddleware = t.middleware(async (opts) => {
  // biome-ignore lint/suspicious/noConsoleLog: デバッグ用の一時的なログ
  console.log("Auth middleware called:", {
    hasHeaders: !!opts.ctx.req.headers,
    userAgent: opts.ctx.req.headers.get("user-agent"),
    url: opts.ctx.req.url,
  });

  try {
    const session = await auth.api.getSession({
      headers: opts.ctx.req.headers,
    });

    // biome-ignore lint/suspicious/noConsoleLog: デバッグ用の一時的なログ
    console.log("Session result:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
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
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Detailed auth error:", {
      message: err.message,
      stack: err.stack,
      name: err.constructor.name,
    });
    throw err;
  }
});
