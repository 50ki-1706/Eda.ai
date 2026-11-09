"use client";
import AppShell from "@/components/common/AppShell";
import MessageInputBar from "@/components/common/MessageInputBar";
import Toast from "@/components/common/Toast";
import { useUserSettings } from "@/hooks/common/useModelPicker";
import { useMessageInput } from "@/hooks/domain/chat/useMessageInput";
import { apiClient } from "@/lib/trpc";
import type { Message } from "@/types";
import { GitBranch, Network } from "lucide-react";
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

  // ユーザー設定（選択中モデル・API キー登録状況）
  const { modelId, availability, models, persistModel } = useUserSettings();

  const latestMessageId = useMemo(() => {
    return messages.length > 0 ? messages[messages.length - 1].id : null;
  }, [messages]);

  const {
    toast,
    setToast,
    messages: newMessages,
    ...messageInput
  } = useMessageInput(
    chatId,
    branchId,
    latestMessageId,
    messages,
    setMessages,
    modelId,
  );

  const handleModelChange = async (nextModelId: string) => {
    try {
      await persistModel(nextModelId);
    } catch (error) {
      console.error("Failed to save model:", error);
      setToast("モデルの保存に失敗しました");
    }
  };

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
    <AppShell>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <span className={styles.headerIcon} aria-hidden="true">
              <GitBranch size={16} />
            </span>
            <h1 className={styles.headerTitle}>チャット</h1>
            <span className={styles.headerMeta}>
              {newMessages.length} 件のメッセージ
            </span>
          </div>
          <Link
            href={`/chat/${chatId}/tree`}
            className={styles.headerAction}
            aria-label="ブランチツリーを表示"
            title="ブランチツリーを表示"
          >
            <Network size={16} aria-hidden="true" />
            <span className={styles.headerActionLabel}>ツリー</span>
          </Link>
        </div>
      </header>

      <div className={styles.transcript}>
        <ChatMessageList
          messages={newMessages}
          onCreateBranch={handleCreateBranch}
          chatListRef={chatListRef}
        />
      </div>

      <div className={styles.composerArea}>
        <div className={styles.composerInner}>
          <MessageInputBar
            {...messageInput}
            modelId={modelId}
            onModelChange={handleModelChange}
            modelAvailability={availability}
            models={models}
            placeholder="返信を入力…"
          />
          <p className={styles.hint}>Enter で送信 / Shift + Enter で改行</p>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
};

export default ChatPage;
