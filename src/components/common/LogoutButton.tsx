"use client";

import { useLogout } from "@/hooks/common/useLogout";
import styles from "./LogoutButton.module.css";

const LogoutButton = () => {
  const { handleSignOut } = useLogout();

  return (
    <button type="button" className={styles.button} onClick={handleSignOut}>
      ログアウト
    </button>
  );
};

export default LogoutButton;
