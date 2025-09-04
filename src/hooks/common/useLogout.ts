"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const useLogout = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login"); // redirect to login page
        },
      },
    });
  };

  return { handleSignOut };
};
