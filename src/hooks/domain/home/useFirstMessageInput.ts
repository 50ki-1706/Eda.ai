import { useMessageInputBase } from "@/hooks/common/useMessageInputBase";
import { apiClient } from "@/lib/trpc";
import { useRouter } from "next/navigation";

export function useFirstMessageInput() {
  const router = useRouter();

  const { onSend, ...rest } = useMessageInputBase(
    async (promptText, promptFile) => {
      const res = await apiClient.chat.new.mutate({
        promptText,
        promptFile,
        provider: "openrouter",
      });
      router.push(`/chat/${res.chat.id}/branch/${res.branch.id}`);
    },
  );

  return {
    onSend,
    ...rest,
  };
}
