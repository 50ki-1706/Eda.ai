"use client";

import AppShell from "@/components/common/AppShell";
import MessageInputBar from "@/components/common/MessageInputBar";
import Toast from "@/components/common/Toast";
import { useUserSettings } from "@/hooks/common/useUserSettings";
import { useFirstMessageInput } from "@/hooks/domain/home/useFirstMessageInput";
import {
  GitBranch,
  GitMerge,
  GitPullRequestArrow,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./HomePage.module.css";
import Title from "./Title";

/** ホーム画面に並べる機能の紹介 */
const features = [
  {
    icon: GitBranch,
    title: "分岐",
    description:
      "任意のメッセージから別の会話を生やし、選択肢を並べて比較できます。",
  },
  {
    icon: GitPullRequestArrow,
    title: "探索",
    description:
      "ツリー表示で会話の流れを俯瞰し、気になる枝へすぐ移動できます。",
  },
  {
    icon: GitMerge,
    title: "統合",
    description:
      "残したい流れを選んでマージし、一本の会話としてまとめられます。",
  },
] as const;

/**
 * ホーム画面
 * 新規チャットの起点として、中央にタイトルとコンポーザを置く
 */
export default function HomePage() {
  const { modelId, availability, models, persistModel } = useUserSettings();
  const { toast, setToast, streamingText, streamingPrompt, ...messageInput } =
    useFirstMessageInput(modelId);

  // 最初のメッセージ送信後、応答の確定（チャット画面への遷移）までを表示する
  const isStreaming = streamingText !== "" || streamingPrompt !== "";

  const handleModelChange = async (nextModelId: string) => {
    try {
      await persistModel(nextModelId);
    } catch (error) {
      console.error("Failed to save model:", error);
      setToast("モデルの保存に失敗しました");
    }
  };

  return (
    <AppShell>
      <div className={styles.hero}>
        <div className={styles.inner}>
          {isStreaming ? (
            // 送信直後: タイトルを小さく残し、確定前の会話をストリーミング表示する
            <div className={styles.streaming} aria-live="polite">
              <p className={styles.streamingEyebrow}>
                <span className={styles.streamingIcon} aria-hidden="true">
                  <Sparkles size={14} />
                </span>
                <span>応答を生成しています</span>
              </p>
              {streamingPrompt && (
                <div className={styles.userRow}>
                  <div className={styles.userBubble}>{streamingPrompt}</div>
                </div>
              )}
              <div className={styles.assistantRow}>
                <div className={styles.markdown}>
                  {streamingText && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingText}
                    </ReactMarkdown>
                  )}
                </div>
                <span className={styles.cursor} aria-hidden="true" />
              </div>
            </div>
          ) : (
            <>
              <Title />

              <MessageInputBar
                {...messageInput}
                modelId={modelId}
                onModelChange={handleModelChange}
                modelAvailability={availability}
                models={models}
                placeholder="何を手伝いましょうか？"
              />

              <ul className={styles.features}>
                {features.map((feature) => (
                  <li key={feature.title} className={styles.feature}>
                    <span className={styles.featureIcon} aria-hidden="true">
                      <feature.icon size={16} />
                    </span>
                    <div>
                      <p className={styles.featureTitle}>{feature.title}</p>
                      <p className={styles.featureText}>
                        {feature.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
