import { createContext } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { experimental_ValibotToJsonSchemaConverter } from "@orpc/valibot";

/**
 * OpenAPI 用ハンドラー
 * - /api/openapi        … Swagger UI（API リファレンス）
 * - /api/openapi/spec.json … OpenAPI 仕様 JSON
 * - それ以外のパス      … REST 形式の API 呼び出し
 */
const handler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      // Swagger UI を配信する
      docsProvider: "swagger",
      // valibot スキーマを OpenAPI の JSON Schema に変換する
      schemaConverters: [new experimental_ValibotToJsonSchemaConverter()],
      specGenerateOptions: {
        info: {
          title: "Eda.ai API",
          version: "1.0.0",
          description:
            "Eda.ai の分岐型チャット API。oRPC のコントラクトから自動生成された OpenAPI 仕様です。",
        },
      },
    }),
  ],
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
    prefix: "/api/openapi",
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
