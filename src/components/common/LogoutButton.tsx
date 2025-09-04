"use client";

import { useLogout } from "@/hooks/common/useLogout";
import { Button } from "@mui/material";

const LogoutButton = () => {
  const { handleSignOut } = useLogout();

  return (
    <Button
      onClick={handleSignOut}
      variant="outlined"
      sx={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 50,
        color: "black",
        borderColor: "black",
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
          borderColor: "black",
        },
      }}
    >
      ログアウト
    </Button>
  );
};

export default LogoutButton;
