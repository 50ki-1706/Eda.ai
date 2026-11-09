"use client";

import { useIsDesktop } from "@/hooks/common/useMediaQuery";
import { client } from "@/lib/orpc/client";
import { useUiStore } from "@/stores/uiStore";
import type { Chat } from "@/types";
import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();

  // 現在開いているチャット（`/chat/[id]/...` の id）
  const activeChatId = pathname?.split("/")[2] ?? null;

  useEffect(() => {
    let cancelled = false;

    const fetchChats = async () => {
      try {
        const res = await client.chat.getChatsByUserId();
        if (!cancelled) setChats(res);
      } catch (error) {
        console.error("Failed to fetch sidebar data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchChats();
    return () => {
      cancelled = true;
    };
  }, []);

  // デスクトップへ切り替わったらモバイル用ドロワーは閉じる
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop, setDrawerOpen]);

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}/tree`);
    setDrawerOpen(false);
  };

  const handleAddChat = () => {
    router.push("/home");
    setDrawerOpen(false);
  };

  return {
    chats,
    loading,
    activeChatId,
    isDesktop,
    sidebarCollapsed,
    drawerOpen,
    toggleSidebar,
    toggleDrawer,
    handleChatClick,
    handleAddChat,
  };
};
