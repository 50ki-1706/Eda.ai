import { useMessageInputBase } from "@/hooks/common/useMessageInputBase";
import { apiClient } from "@/lib/trpc";
import type { Message } from "@prisma/client";

export function useMessageInput(
  _unused: string,
  branchId: string,
  latestMessageId: string | null,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
) {
  const { onSend, ...rest } = useMessageInputBase(
    async (promptText, promptFile) => {
      if (latestMessageId === null) {
        rest.setToast("メッセージを送信できませんでした");
        return;
      }
      const res = await apiClient.chat.branch.sendMessage.mutate({
        promptText,
        promptFile,
        branchId: branchId as string,
        latestMessageId,
        provider: "openrouter",
      });
      const messageWithDateObject = {
        ...res,
        createdAt:
          typeof res.createdAt === "string"
            ? new Date(res.createdAt)
            : res.createdAt,
      };
      setMessages([...messages, messageWithDateObject]);
      await new Promise((r) => setTimeout(r, 450));
    },
  );

  return {
    onSend,
    ...rest,
    messages,
  };
}
