"use client";

import type { Message } from "@/types";
import { GitBranch, Sparkles } from "lucide-react";
import { memo } from "react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./ChatMessageList.module.css";

/* ユーザー発言の吹き出し */
interface BubbleProps {
  text: string;
}

const UserBubble = memo(function UserBubble({ text }: BubbleProps) {
  return (
    <div className={styles.userRow}>
      <div className={styles.userBubble}>{text}</div>
    </div>
  );
});

/* AI 応答: 吹き出しを使わず、本文を読みやすく全幅で表示する */
interface ResponseProps {
  text: string;
  onCreateBranch?: () => void;
  /** ストリーミング中（確定前）の応答かどうか */
  streaming?: boolean;
}

const AssistantResponse = memo(function AssistantResponse({
  text,
  onCreateBranch,
  streaming = false,
}: ResponseProps) {
  return (
    <div className={styles.assistantRow}>
      <span className={styles.avatar} aria-hidden="true">
        <Sparkles size={16} />
      </span>
      <div className={styles.assistantBody}>
        {text ? (
          <div className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          // 本文がまだ届いていない間も行の高さを保ち、レイアウトの跳ねを防ぐ
          streaming && <div className={styles.streamingPlaceholder} />
        )}
        {streaming && <span className={styles.cursor} aria-hidden="true" />}
        {onCreateBranch && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.branchButton}
              aria-label="この対話からブランチを作成"
              title="この対話からブランチを作成"
              onClick={onCreateBranch}
            >
              <GitBranch size={14} aria-hidden="true" />
              <span>ブランチを作成</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export const DateSeparator = memo(function DateSeparator({
  label,
}: {
  label: string;
}) {
  return (
    <div className={styles.separator}>
      <div className={styles.separatorLine} />
      <span className={styles.separatorLabel}>{label}</span>
      <div className={styles.separatorLine} />
    </div>
  );
});

export interface ChatMessageListProps {
  messages: Message[];
  /** ストリーミング中のアシスタント応答（確定前）。空文字なら未ストリーミング */
  streamingText?: string;
  /** ストリーミング中に送信したユーザーのプロンプト（確定前の吹き出し表示用） */
  streamingPrompt?: string;
  dateLabel?: string;
  onCreateBranch?: (messageId: string) => void;
  chatListRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 会話のメッセージ一覧
 * ユーザー発言は右寄せの吹き出し、AI 応答はアイコン付きの本文として表示する。
 * ストリーミング中は確定前のユーザー発言とアシスタント応答を末尾に追加表示する。
 */
export const ChatMessageList = ({
  messages,
  streamingText = "",
  streamingPrompt = "",
  dateLabel = "Today",
  onCreateBranch,
  chatListRef,
}: ChatMessageListProps) => {
  // 確定前の応答を表示するかどうか（本文が届く前の待機中も表示する）
  const isStreaming = streamingText !== "" || streamingPrompt !== "";

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <DateSeparator label={dateLabel} />
        {messages.length === 0 && !isStreaming && (
          <p className={styles.empty}>
            まだメッセージがありません。下の入力欄から話しかけてみましょう。
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={styles.messageGroup}>
            {msg.promptText && <UserBubble text={msg.promptText} />}
            {msg.response && (
              <AssistantResponse
                text={msg.response}
                onCreateBranch={
                  onCreateBranch ? () => onCreateBranch(msg.id) : undefined
                }
              />
            )}
          </div>
        ))}
        {isStreaming && (
          // ストリーミング中（確定前）の1ユニット。ブランチ作成は確定後のみ表示する
          <div className={styles.messageGroup} aria-live="polite">
            {streamingPrompt && <UserBubble text={streamingPrompt} />}
            <AssistantResponse text={streamingText} streaming />
          </div>
        )}
        <div ref={chatListRef} className={styles.scrollAnchor} />
      </div>
    </div>
  );
};

export default ChatMessageList;
