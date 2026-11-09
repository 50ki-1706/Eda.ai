import { createContext } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

/**
 * oRPC の型安全 RPC 用ハンドラー
 * クライアント（RPCLink）からは /api/rpc を基点に呼び出す
 */
const handler = new RPCHandler(router, {
  interceptors: [
    // ハンドラー内で発生した例外はサーバーログに残す
    onError((error) => console.error(error)),
  ],
});

/**
 * すべての HTTP メソッドを同じハンドラーで処理する
 * コンテキストは headers() を参照するため、リクエストごとに生成する
 */
async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await createContext(),
  });

  return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
