"use client";

import AppShell from "@/components/common/AppShell";
import MessageInputBar from "@/components/common/MessageInputBar";
import Toast from "@/components/common/Toast";
import { useUserSettings } from "@/hooks/common/useModelPicker";
import { useFirstMessageInput } from "@/hooks/domain/home/useFirstMessageInput";
import { GitBranch, GitMerge, GitPullRequestArrow } from "lucide-react";
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
  const { toast, setToast, ...messageInput } = useFirstMessageInput(modelId);

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
                  <p className={styles.featureText}>{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
