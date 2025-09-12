import { apiClient } from "@/lib/trpc";
import type { RawNodeDatum } from "@/types/tree";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function useTree() {
  const params = useParams();
  const router = useRouter();
  const [translate, setTranslate] = useState<{ x: number; y: number }>();
  const [branchStructure, setBranchStructure] = useState<RawNodeDatum>();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (typeof params.id !== "string") return;
    (async () => {
      try {
        // Sidebar から渡される chatId は chat テーブルのものなので project ではなく chat ルーターを利用する
        const res = await apiClient.chat.branch.structure.query({
          chatId: params.id as string,
        });
        setBranchStructure(res);
      } catch (e) {
        console.error("Failed to fetch branch structure (chat):", e);
      }
    })();

    // レイアウト計算（クライアントでのみ実行）
    const handleResize = () => {
      setTranslate({
        x: window.innerWidth / 2 - 100,
        y: window.innerHeight / 2,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [params.id]);

  const handleBranchNavigation = (branchId: string) => {
    if (branchId) router.push(`/chat/${params.id}/branch/${branchId}`);
  };

  const handleBranchMerge = async (branchId: string) => {
    const chatId: string = params.id as string;
    if (branchId) {
      await apiClient.chat.branch.merge.mutate({
        branchId: branchId,
      });

      const res = await apiClient.chat.branch.structure.query({
        chatId: chatId,
      });

      setBranchStructure(res);
      setIsChecked(false);
    }
  };

  const handleClick = async (
    branchId: string,
    handleBranchMerge: (branchId: string) => Promise<void>,
    handleBranchNavigation: (branchId: string) => void,
  ): Promise<void> => {
    if (isChecked) {
      await handleBranchMerge(branchId);
    } else {
      handleBranchNavigation(branchId);
    }
  };
  return {
    translate,
    handleBranchMerge,
    handleBranchNavigation,
    handleClick,
    isChecked,
    setIsChecked,
    branchStructure,
  };
}

export default useTree;
