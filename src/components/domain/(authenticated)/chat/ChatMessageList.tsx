"use client";

import type { Message } from "@/types";
import { GitBranch } from "lucide-react";
import { memo } from "react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./ChatMessageList.module.css";

/* バブル吹き出し */
interface BubbleProps {
  mine?: boolean;
  text: string;
  time?: string;
  groupedTop?: boolean;
  groupedBottom?: boolean;
}

const Bubble = memo(function Bubble({
  mine,
  text,
  time,
  groupedBottom,
}: BubbleProps) {
  return (
    <div
      className={`${styles.bubbleRow} ${mine ? styles.mine : ""} ${
        groupedBottom ? styles.bubbleRowTight : ""
      }`
        .trim()
        .replace(/\s+/g, " ")}
    >
      <div
        className={`${styles.bubble} ${mine ? styles.bubbleMine : ""}`.trim()}
      >
        <div className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
        {!!time && <span className={styles.time}>{time}</span>}
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
  dateLabel?: string;
  onCreateBranch?: (messageId: string) => void;
  chatListRef?: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList = ({
  messages,
  dateLabel = "Today",
  onCreateBranch,
  chatListRef,
}: ChatMessageListProps) => {
  return (
    <div className={styles.container}>
      <DateSeparator label={dateLabel} />
      {messages.map((msg) => (
        <div key={msg.id}>
          <div className={styles.messageGroup}>
            <div>
              {msg.promptText && (
                <Bubble mine text={msg.promptText} groupedBottom />
              )}
            </div>

            <div className={styles.responseBlock}>
              <div className={styles.responseWidth}>
                {msg.response && <Bubble text={msg.response} groupedTop />}
              </div>
              <div className={styles.branchRow}>
                <button
                  type="button"
                  className={styles.branchButton}
                  aria-label="この対話からブランチを作成"
                  title="この対話からブランチを作成"
                  onClick={() => onCreateBranch?.(msg.id)}
                >
                  <GitBranch size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div ref={chatListRef} className={styles.scrollAnchor} />
    </div>
  );
};

export default ChatMessageList;
