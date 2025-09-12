import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Vercelプレビュー環境用の詳細情報取得
    const url = new URL(request.url);
    const currentURL = `${url.protocol}//${url.host}`;

    // 1. 環境変数確認
    const envCheck = {
      // 基本環境情報
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL === "1" ? "Vercel環境" : "ローカル環境",
      VERCEL_URL: process.env.VERCEL_URL || "未設定",
      currentURL: currentURL,

      // 認証関連
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET
        ? "設定済み"
        : "❌ 未設定",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "❌ 未設定",

      // OAuth設定
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "設定済み" : "未設定",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
        ? "設定済み"
        : "未設定",

      // データベース
      DATABASE_URL: process.env.DATABASE_URL ? "設定済み" : "❌ 未設定",

      // LLM API
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "設定済み" : "未設定",
    };

    console.info("=== Vercel Preview Debug ===");
    console.info("Environment check:", envCheck);

    // 2. 認証テスト
    const authResult = await (async (): Promise<{
      status: string;
      userId: string | null;
      error: string | { message: string; name: string } | null;
    }> => {
      try {
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session?.user) {
          return {
            status: "セッションなし",
            userId: null,
            error: "未ログイン状態",
          };
        }
        return {
          status: "成功",
          userId: session.user.id,
          error: null,
        };
      } catch (authError) {
        const err =
          authError instanceof Error ? authError : new Error(String(authError));
        console.error("Auth error:", authError);
        return {
          status: "エラー",
          userId: null,
          error: {
            message: err.message,
            name: err.constructor.name,
          },
        };
      }
    })();

    // 3. データベース接続テスト
    const dbResult = await (async (): Promise<{
      status: string;
      connectionTest: boolean;
      queryTest: boolean;
      error: { message: string; name: string; code?: string } | null;
    }> => {
      try {
        // 接続テスト
        await prisma.$connect();

        // クエリテスト
        await prisma.$queryRaw`SELECT 1 as test`;

        return {
          status: "成功",
          connectionTest: true,
          queryTest: true,
          error: null,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Database error:", error);
        return {
          status: "エラー",
          connectionTest: false,
          queryTest: false,
          error: {
            message: err.message,
            name: err.constructor.name,
            code: (error as { code?: string }).code || "不明",
          },
        };
      }
    })();

    // 4. プロジェクト取得テスト（認証成功時のみ）
    const projectResult = await (async (): Promise<{
      status: string;
      count: number;
      error: { message: string; name: string } | null;
    }> => {
      if (authResult.status === "成功" && authResult.userId) {
        try {
          const projects = await prisma.project.findMany({
            where: { userId: authResult.userId },
            take: 10,
          });

          return {
            status: "成功",
            count: projects.length,
            error: null,
          };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error("Project query error:", error);
          return {
            status: "エラー",
            count: 0,
            error: {
              message: err.message,
              name: err.constructor.name,
            },
          };
        }
      }

      return {
        status: "スキップ",
        count: 0,
        error: null,
      };
    })();

    // 結果をまとめて返す
    const result = {
      timestamp: new Date().toISOString(),
      vercelInfo: {
        isVercel: process.env.VERCEL === "1",
        url: process.env.VERCEL_URL,
        currentURL: currentURL,
        branch: process.env.VERCEL_GIT_COMMIT_REF || "不明",
      },
      environment: envCheck,
      tests: {
        auth: authResult,
        database: dbResult,
        projects: projectResult,
      },
      recommendations: generateRecommendations(envCheck, authResult, dbResult),
    };

    console.info("Debug result:", result);
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("Debug API critical error:", error);
    const err = error instanceof Error ? error : new Error(String(error));

    return Response.json(
      {
        error: "デバッグAPI自体でエラーが発生しました",
        details: {
          message: err.message,
          stack: err.stack,
          name: err.constructor.name,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// 設定の推奨事項を生成
function generateRecommendations(
  envCheck: Record<string, string>,
  authResult: { status: string },
  dbResult: { status: string },
) {
  const recommendations = [];

  if (envCheck.BETTER_AUTH_SECRET.includes("❌")) {
    recommendations.push("BETTER_AUTH_SECRET環境変数を設定してください");
  }

  if (envCheck.BETTER_AUTH_URL.includes("❌")) {
    recommendations.push(
      "BETTER_AUTH_URL環境変数をプレビューURLに設定してください",
    );
  }

  if (envCheck.DATABASE_URL.includes("❌")) {
    recommendations.push(
      "DATABASE_URL環境変数にSupabase接続文字列を設定してください",
    );
  }

  if (authResult.status === "エラー") {
    recommendations.push(
      "認証設定を確認してください（BETTER_AUTH_SECRET, BETTER_AUTH_URL）",
    );
  }

  if (dbResult.status === "エラー") {
    recommendations.push(
      "データベース接続設定を確認してください（DATABASE_URL）",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ 全ての設定が正常です！");
  }

  return recommendations;
}
