"use client";

import AppShell from "@/components/common/AppShell";
import { authClient } from "@/lib/auth-client";
import { GitBranch, GitMerge, GitPullRequestArrow } from "lucide-react";
import { useState } from "react";
import styles from "./LoginPage.module.css";

/** ログイン画面で示すアプリの価値 */
const points = [
  { icon: GitBranch, label: "会話を分岐させて比較" },
  { icon: GitPullRequestArrow, label: "ツリーで全体を俯瞰" },
  { icon: GitMerge, label: "残したい流れをマージ" },
] as const;

const LoginPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/home",
      });
    } catch (err) {
      console.error(err);
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
      setSigningIn(false);
    }
  }

  return (
    <AppShell withSidebar={false}>
      <div className={styles.page}>
        <section className={styles.card} aria-labelledby="login-title">
          <span className={styles.mark} aria-hidden="true">
            <GitBranch size={22} />
          </span>
          <h1 id="login-title" className={styles.title}>
            Eda<span className={styles.accent}>.ai</span>
          </h1>
          <p className={styles.lead}>
            分岐する AI
            チャット。会話の流れを枝分かれさせ、比較して、一本にまとめる。
          </p>

          <ul className={styles.points}>
            {points.map((point) => (
              <li key={point.label} className={styles.point}>
                <point.icon size={16} aria-hidden="true" />
                {point.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={styles.button}
            onClick={handleGoogleSignIn}
            disabled={signingIn}
          >
            {signingIn ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            Google でログイン
          </button>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <p className={styles.note}>
            ログインすると、あなたのチャットと設定がこのアカウントに保存されます。
          </p>
        </section>
      </div>
    </AppShell>
  );
};

/** Google の「G」マーク（公式の 4 色ロゴ） */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
    />
  </svg>
);

export default LoginPage;
