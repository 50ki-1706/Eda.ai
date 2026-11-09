import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { AppContract } from "./contract";

/**
 * oRPC クライアント
 *
 * ブラウザ・サーバーの両方から利用できる。
 * - ブラウザ: 現在のオリジン（`window.location.origin`）へリクエストする
 * - サーバー: `NEXT_PUBLIC_APP_URL` をベースにし、受信リクエストのヘッダーを引き継ぐ
 *   （認証 Cookie をそのまま転送するため）
 *
 * このファイルはクライアントコンポーネントからも import されるため、
 * `next/headers` はブラウザバンドルに含まれないよう動的 import にしている。
 */
const link = new RPCLink({
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/rpc`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/rpc`,
  headers: async () => {
    // ブラウザでは Cookie が自動送信されるため、追加ヘッダーは不要
    if (typeof window !== "undefined") return {};

    // サーバーサイドでは受信リクエストのヘッダーを引き継ぐ
    const { headers } = await import("next/headers");
    return Object.fromEntries(await headers());
  },
});

/**
 * コントラクトから推論した型付きクライアント
 *
 * 手続きは `client.chat.branch.getMessages({ branchId })` のように直接呼び出す。
 * ストリーミング手続き（`chat.new` / `chat.branch.sendMessage`）は
 * `Promise<AsyncIterable<イベント>>` を返すので `for await` で消費する。
 */
export const client: ContractRouterClient<AppContract> = createORPCClient(link);
