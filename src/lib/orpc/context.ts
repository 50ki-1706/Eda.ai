import { getUserInfo } from "@/app/api/lib";

/**
 * oRPC のリクエスト単位コンテキスト
 * 認証済みなら user にログインユーザーの情報が入り、未ログインなら null になる
 */
export interface ORPCContext {
  user: Awaited<ReturnType<typeof getUserInfo>> | null;
}

/**
 * リクエストごとにコンテキストを生成する
 *
 * getUserInfo は next/headers の headers() を参照するため、
 * Next.js のリクエストスコープ内（ルートハンドラー）から毎回呼び出す必要がある。
 */
export const createContext = async (): Promise<ORPCContext> => ({
  user: await getUserInfo(),
});
