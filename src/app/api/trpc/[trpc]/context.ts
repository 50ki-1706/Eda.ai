import { auth } from "@/auth";

export const createContext = async ({ req }: { req: Request }) => {
  return {
    req,
    auth,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
