"use client";

import PageContainer from "@/components/common/PageContainer";
import { authClient } from "@/lib/auth-client";
import styles from "./LoginPage.module.css";

const LoginPage = () => {
  async function handleGoogleSignIn() {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/home",
      });
    } catch (error) {
      console.error(error);
    }
  }
  return (
    <PageContainer>
      <div className={styles.wrapper}>
        <button
          type="button"
          className={styles.button}
          onClick={handleGoogleSignIn}
        >
          Googleログイン
        </button>
      </div>
    </PageContainer>
  );
};

export default LoginPage;
