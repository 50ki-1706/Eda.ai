"use client";

import LogoutButton from "@/components/common/LogoutButton";
import MessageInputBar from "@/components/common/MessageInputBar";
import PageContainer from "@/components/common/PageContainer";
import Sidebar from "@/components/common/Sidebar";
import { useFirstMessageInput } from "@/hooks/domain/home/useFirstMessageInput";
import { Box, Snackbar, Stack, alpha } from "@mui/material";
import Title from "./Title";

export default function HomePage() {
  const { toast, setToast, ...messageInput } = useFirstMessageInput();

  return (
    <PageContainer>
      <LogoutButton />
      <Sidebar />
      <Box
        sx={{
          minHeight: "100dvh",
          width: "100%",
          display: "grid",
          placeItems: "center",
          px: 2,
          py: 6,
          // 背景：ごく薄いグラデ＋パターン
          background: (t) =>
            `linear-gradient(180deg, ${alpha(t.palette.primary.light, 0.06)} 0%, transparent 30%),
             linear-gradient(0deg, ${alpha(t.palette.common.black, 0.02)} 0%, transparent 60%)`,
        }}
      >
        <Stack spacing={4} sx={{ width: "100%", maxWidth: 820 }}>
          <Title />
          <MessageInputBar {...messageInput} />
        </Stack>

        <Snackbar
          open={!!toast}
          autoHideDuration={2200}
          onClose={() => setToast(null)}
          message={toast ?? ""}
        />
      </Box>
    </PageContainer>
  );
}
