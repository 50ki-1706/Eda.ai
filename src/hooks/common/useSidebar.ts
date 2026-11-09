"use client";

import { useIsDesktop } from "@/hooks/common/useMediaQuery";
import { client } from "@/lib/orpc/client";
import { useUiStore } from "@/stores/uiStore";
import type { Chat } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * サイドバーの状態（チャット一覧・開閉）を扱うフック
 *
 * 開閉状態はグローバルな UI ストア（zustand）に保持し、
 * デスクトップでは折りたたみ、モバイルではドロワーとして振る舞う。
 */
export const useSidebar = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const drawerOpen = useUiStore((state) => state.drawerOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const toggleDrawer = useUiStore((state) => state.toggleDrawer);
  const setDrawerOpen = useUiStore((state) => state.setDrawerOpen);

  const isDesktop = useIsDesktop();
  const router = useRouter();

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const chatRes = await client.chat.getChatsByUserId();
        setChats(chatRes);
      } catch (error) {
        console.error("Failed to fetch sidebar data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSidebarData();
  }, []);

  // デスクトップへ切り替わったらモバイル用ドロワーは閉じる
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop, setDrawerOpen]);

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}/tree/`);
    setDrawerOpen(false);
  };

  const handleAddChat = () => {
    router.push("/home");
    setDrawerOpen(false);
  };

  return {
    chats,
    loading,
    isDesktop,
    sidebarCollapsed,
    drawerOpen,
    toggleSidebar,
    toggleDrawer,
    handleChatClick,
    handleAddChat,
  };
};
