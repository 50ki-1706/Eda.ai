import { client } from "@/lib/orpc/client";
import type { RawNodeDatum } from "@/types/tree";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function useTree() {
  const params = useParams();
  const router = useRouter();
  const [branchStructure, setBranchStructure] = useState<RawNodeDatum>();
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof params.id !== "string") return;
    (async () => {
      try {
        // Sidebar から渡される chatId は chat テーブルのものなので chat ルーターを利用する
        const res = await client.chat.branch.structure({
          chatId: params.id as string,
        });
        setBranchStructure(res);
      } catch (e) {
        console.error("Failed to fetch branch structure (chat):", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const handleBranchNavigation = (branchId: string) => {
    if (branchId) router.push(`/chat/${params.id}/branch/${branchId}`);
  };

  const handleBranchMerge = async (branchId: string) => {
    const chatId: string = params.id as string;
    if (branchId) {
      await client.chat.branch.merge({
        branchId: branchId,
      });

      const res = await client.chat.branch.structure({
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
    handleBranchMerge,
    handleBranchNavigation,
    handleClick,
    isChecked,
    setIsChecked,
    branchStructure,
    loading,
    chatId: typeof params.id === "string" ? params.id : "",
  };
}

export default useTree;
