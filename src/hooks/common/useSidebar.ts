"use client";

import { apiClient } from "@/lib/trpc";
import type { Chat, Project } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const useSidebar = () => {
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const [projRes, chatRes] = await Promise.all([
          apiClient.project.list.query(),
          apiClient.chat.getChatsByUserId.query(),
        ]);
        setProjects(
          projRes.map((project) => ({
            ...project,
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
          })),
        );
        setChats(
          chatRes.map((chat) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
          })),
        );
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
    projects,
    chats,
    toggleDrawer,
    handleChatClick,
    handleAddChat,
  };
};
