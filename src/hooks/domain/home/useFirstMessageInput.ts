"use client";

import { useChatStream } from "@/hooks/common/useChatStream";
import { useMessageInputBase } from "@/hooks/common/useMessageInputBase";
import { client } from "@/lib/orpc/client";
import type { CreateChatDoneEvent } from "@/lib/orpc/contract";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * ホーム画面の最初のメッセージ送信フック
 *
 * `client.chat.new` のストリーミングを消費し、
 * 完了時に作成された Chat / Branch へ遷移する。
 * 途中経過の描画は呼び出し側（HomePage）が
 * `streamingText` と `sending` を参照して行う。
 */
export function useFirstMessageInput(modelId: string) {
  const router = useRouter();

  const onDone = useCallback(
    (event: CreateChatDoneEvent) => {
      // 作成されたチャットのブランチへ遷移する
      router.push(`/chat/${event.chat.id}/branch/${event.branch.id}`);
    },
    [router],
  );

  const { start, streamingText } = useChatStream<CreateChatDoneEvent>(onDone);

  const createChat = useCallback(
    async (
      promptText: string,
      promptFile?: { data: string; mimeType: string },
    ) => {
      await start(client.chat.new({ promptText, promptFile, modelId }));
    },
    [modelId, start],
  );

  const { onSend, ...rest } = useMessageInputBase(createChat);

  return {
    onSend,
    ...rest,
    /** ストリーミング中のアシスタント応答（確定前）。空文字なら未ストリーミング */
    streamingText,
  };
}
