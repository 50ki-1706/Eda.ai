"use client";

import LogoutButton from "@/components/common/LogoutButton";
import MessageInputBar from "@/components/common/MessageInputBar";
import PageContainer from "@/components/common/PageContainer";
import Sidebar from "@/components/common/Sidebar";
import Toast from "@/components/common/Toast";
import { useUserSettings } from "@/hooks/common/useModelPicker";
import { useFirstMessageInput } from "@/hooks/domain/home/useFirstMessageInput";
import styles from "./HomePage.module.css";
import Title from "./Title";

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
    <PageContainer>
      <LogoutButton />
      <Sidebar />
      <div className={styles.hero}>
        <div className={styles.inner}>
          <Title />
          <MessageInputBar
            {...messageInput}
            modelId={modelId}
            onModelChange={handleModelChange}
            modelAvailability={availability}
            models={models}
          />
        </div>

        <Toast message={toast} onClose={() => setToast(null)} />
      </div>
    </PageContainer>
  );
}
