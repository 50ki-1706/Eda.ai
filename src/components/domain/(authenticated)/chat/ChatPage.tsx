"use client";
import MessageInputBar from "@/components/common/MessageInputBar";
import Sidebar from "@/components/common/Sidebar";
import Toast from "@/components/common/Toast";
import { useMessageInput } from "@/hooks/domain/chat/useMessageInput";
import { apiClient } from "@/lib/trpc";
import type { Message } from "@/types";
import { TreePine } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ChatMessageList from "./ChatMessageList";
import styles from "./ChatPage.module.css";

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

  // 最新メッセージが変わったら（取得・送信時）、チャットリストをスクロールする
  useEffect(() => {
    if (!latestMessageId) return;
    chatListRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [latestMessageId]);

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
    <div className={styles.page}>
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <ChatMessageList
            messages={newMessages}
            onCreateBranch={handleCreateBranch}
            chatListRef={chatListRef}
          />
          <div className={styles.inputArea}>
            <div className={styles.inputRow}>
              <MessageInputBar {...messageInput} className={styles.inputBar} />
              <Link
                href="/chat/[id]/branch/tree"
                as={`/chat/${chatId}/tree`}
                aria-label="ブランチツリーを表示"
                title="ブランチツリーを表示"
                className={styles.treeLink}
              >
                <TreePine aria-hidden="true" />
              </Link>
            </div>
          </div>
        </main>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default ChatPage;
