"use client";

import { client } from "@/lib/orpc/client";
import type { TreeNode } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * ブランチツリー画面の状態を扱うフック
 *
 * - ツリー構造の取得（初回・マージ後）
 * - ノード選択時の動作（通常は遷移、マージモードではマージ）
 */
export const useTree = () => {
  const params = useParams();
  const router = useRouter();
  const chatId = typeof params.id === "string" ? params.id : "";

  const [branchStructure, setBranchStructure] = useState<TreeNode>();
  const [mergeMode, setMergeMode] = useState(false);
  const [loading, setLoading] = useState(true);

  /** ツリー構造を取得し直す */
  const fetchStructure = useCallback(async () => {
    if (!chatId) return;
    const res = await client.chat.branch.structure({ chatId });
    setBranchStructure(res);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;
    const load = async () => {
      try {
        await fetchStructure();
      } catch (error) {
        console.error("Failed to fetch branch structure (chat):", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [chatId, fetchStructure]);

  /** ノード選択時の動作。マージモードならマージし、そうでなければブランチへ遷移する */
  const handleNodeClick = async (branchId: string) => {
    if (!branchId) return;

    if (!mergeMode) {
      router.push(`/chat/${chatId}/branch/${branchId}`);
      return;
    }

    await client.chat.branch.merge({ branchId });
    await fetchStructure();
    setMergeMode(false);
  };

  return {
    chatId,
    branchStructure,
    loading,
    mergeMode,
    setMergeMode,
    handleNodeClick,
  };
};
