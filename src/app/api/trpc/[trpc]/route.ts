import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "./context";
import { apiRoutes } from "./routers/_index";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: apiRoutes,
    createContext: ({ req }) => createContext({ req }), // 修正：リクエストオブジェクトを渡す
    onError: (opts) => {
      const { error, type, path, input, req } = opts;
      console.error("TRPC Error:", {
        error: error.message,
        stack: error.stack,
        type,
        path,
        input,
        userAgent: req.headers.get("user-agent"),
        url: req.url,
      });
    },
  });
}

export { handler as GET, handler as POST };
