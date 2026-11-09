"use client";

import LogoutButton from "@/components/common/LogoutButton";
import MessageInputBar from "@/components/common/MessageInputBar";
import PageContainer from "@/components/common/PageContainer";
import Sidebar from "@/components/common/Sidebar";
import Toast from "@/components/common/Toast";
import { useFirstMessageInput } from "@/hooks/domain/home/useFirstMessageInput";
import styles from "./HomePage.module.css";
import Title from "./Title";

export default function HomePage() {
  const { toast, setToast, ...messageInput } = useFirstMessageInput();

  return (
    <PageContainer>
      <LogoutButton />
      <Sidebar />
      <div className={styles.hero}>
        <div className={styles.inner}>
          <Title />
          <MessageInputBar {...messageInput} />
        </div>

        <Toast message={toast} onClose={() => setToast(null)} />
      </div>
    </PageContainer>
  );
}
