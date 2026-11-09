"use client";

import { useChatStream } from "@/hooks/common/useChatStream";
import { useMessageInputBase } from "@/hooks/common/useMessageInputBase";
import { client } from "@/lib/orpc/client";
import type { SendMessageDoneEvent } from "@/lib/orpc/contract";
import type { Message } from "@/types";
import { useCallback } from "react";

/**
 * チャット画面のメッセージ送信フック
 *
 * `client.chat.branch.sendMessage` のストリーミングを消費し、
 * 完了時に保存済みの Message でメッセージ一覧を確定する。
 * 途中経過の描画は呼び出し側（ChatPage / ChatMessageList）が
 * `streamingText` と `sending` を参照して行う。
 */
export function useMessageInput(
  branchId: string,
  latestMessageId: string | null,
  setMessages: (update: (prev: Message[]) => Message[]) => void,
  modelId: string,
) {
  const onDone = useCallback(
    (event: SendMessageDoneEvent) => {
      // 保存済みのレコードで確定する（送信中の別更新を取りこぼさないよう関数更新を使う）
      setMessages((prev) => [...prev, event.message]);
    },
    [setMessages],
  );

  const { start, streamingText } = useChatStream<SendMessageDoneEvent>(onDone);

  const sendMessage = useCallback(
    async (
      promptText: string,
      promptFile?: { data: string; mimeType: string },
    ) => {
      if (latestMessageId === null) {
        throw new Error("メッセージを送信できませんでした");
      }

      await start(
        client.chat.branch.sendMessage({
          promptText,
          promptFile,
          branchId,
          latestMessageId,
          modelId,
        }),
      );
    },
    [branchId, latestMessageId, modelId, start],
  );

  const { onSend, toast, setToast, ...rest } = useMessageInputBase(sendMessage);

  return {
    onSend,
    toast,
    setToast,
    ...rest,
    /** ストリーミング中のアシスタント応答（確定前）。空文字なら未ストリーミング */
    streamingText,
  };
}
