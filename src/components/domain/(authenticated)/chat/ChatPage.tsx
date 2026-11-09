"use client";
import MessageInputBar from "@/components/common/MessageInputBar";
import Sidebar from "@/components/common/Sidebar";
import { useMessageInput } from "@/hooks/domain/chat/useMessageInput";
import { apiClient } from "@/lib/trpc";
import type { Message } from "@/types";
import ParkIcon from "@mui/icons-material/Park";
import { Box, Snackbar } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import ChatMessageList from "./ChatMessageList";

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const chatId = typeof params.id === "string" ? params.id : "";
  const branchId = typeof params.branchId === "string" ? params.branchId : "";
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const latestMessageId = useMemo(() => {
    return messages.length > 0 ? messages[messages.length - 1].id : null;
  }, [messages]);

  const {
    toast,
    setToast,
    messages: newMessages,
    ...messageInput
  } = useMessageInput(chatId, branchId, latestMessageId, messages, setMessages);

  useEffect(() => {
    const fetchMessages = async () => {
      if (branchId) {
        try {
          const res = await apiClient.chat.branch.getMessages.query({
            branchId,
          });
          setMessages(res);
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      }
    };

    fetchMessages();
  }, [branchId]);

  // メッセージが更新または取得されたら、チャットリストをスクロールする
  useEffect(() => {
    if (chatListRef.current) {
      //console.debug()はuseEffectの依存配列のエラーを避けるためのものです。
      const m = messages;
      console.debug(m);
      chatListRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCreateBranch = async (messageId: string) => {
    const targetMessage = messages.find((m) => m.id === messageId);
    if (!targetMessage) {
      setToast(
        "ブランチの作成に失敗しました: 対象のメッセージが見つかりません",
      );
      return;
    }

    try {
      const summary =
        targetMessage.promptText.substring(0, 50) +
        (targetMessage.promptText.length > 50 ? "..." : "");

      const res = await apiClient.chat.branch.new.mutate({
        summary,
        parentBranchId: branchId,
        chatId: chatId,
        messageId: messageId,
        promptText: targetMessage.promptText,
        response: targetMessage.response,
      });

      setToast("新しいブランチを作成しました");
      router.push(`/chat/${chatId}/branch/${res.id}`);
    } catch (error) {
      console.error("Failed to create branch:", error);
      setToast("ブランチの作成に失敗しました");
    }
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", height: "100dvh" }}>
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "grid",
            gridTemplateRows: "1fr auto",
            background: (t) =>
              `linear-gradient(180deg, ${t.palette.background.default} 0%,
               ${alpha(t.palette.primary.light, 0.06)} 100%)`,
          }}
        >
          <ChatMessageList
            messages={newMessages}
            onCreateBranch={handleCreateBranch}
            chatListRef={chatListRef}
          />
          <Box
            sx={(t) => ({
              position: "sticky",
              bottom: 0,
              zIndex: 1,
              px: { xs: 1.25, md: 2 },
              py: 1.25,
              borderTop: `1px solid ${t.palette.divider}`,
              backdropFilter: "blur(6px)",
              background: alpha(t.palette.background.paper, 0.8),
            })}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: { xs: 0.5, md: 2 },
                width: "100%",
                gap: 1,
              }}
            >
              <MessageInputBar {...messageInput} sx={{ flex: 1 }} />
              <Link href="/chat/[id]/branch/tree" as={`/chat/${chatId}/tree`}>
                <ParkIcon />
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={2200}
        onClose={() => setToast(null)}
        message={toast ?? ""}
      />
    </Box>
  );
};

export default ChatPage;
