import { apiClient } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RawNodeDatum } from "react-d3-tree";

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

  const handleBranchNavigation = (
    branchId: string | number | boolean | undefined,
  ) => {
    if (branchId) router.push(`/chat/${params.id}/branch/${branchId}`);
  };

  const handleBranchMerge = async (
    branchId: string | number | boolean | undefined,
  ) => {
    if (branchId) {
      await apiClient.chat.branch.merge.mutate({
        branchId: branchId as string,
      });

      const res = await apiClient.chat.branch.structure.query({
        chatId: params.id as string,
      });

      setBranchStructure(res);
      setIsChecked(false);
    }
  };

  const handleClick = async (
    branchId: string | number | boolean | undefined,
    handleBranchMerge: (
      branchId: string | number | boolean | undefined,
    ) => Promise<void>,
    handleBranchNavigation: (
      branchId: string | number | boolean | undefined,
    ) => void,
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
