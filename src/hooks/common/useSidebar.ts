"use client";

import { apiClient } from "@/lib/trpc";
import type { Chat } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const useSidebar = () => {
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [chats, setChats] = useState<Chat[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const chatRes = await apiClient.chat.getChatsByUserId.query();
        setChats(chatRes);
      } catch (error) {
        console.error("Failed to fetch sidebar data:", error);
      }
    };
    fetchSidebarData();
  }, []);

  const toggleDrawer = () => {
    setOpenDrawer((prev) => !prev);
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}/tree/`);
  };

  const handleAddChat = () => {
    router.push("/home");
  };

  return {
    openDrawer,
    chats,
    toggleDrawer,
    handleChatClick,
    handleAddChat,
  };
};
