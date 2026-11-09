import { useMessageInputBase } from "@/hooks/common/useMessageInputBase";
import { client } from "@/lib/orpc/client";
import type { Message } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * チャット画面のメッセージ送信フック
 *
 * `client.chat.branch.sendMessage` は eventIterator を返すため、
 * `for await` でイベントを消費する。
 * - `delta` イベント: 受信したテキスト差分を `streamingText` に追記する
 * - `done` イベント: 保存済みの Message でメッセージ一覧を確定する
 *
 * 途中経過の描画は呼び出し側（ChatPage / ChatMessageList）が
 * `streamingText` と `sending` を参照して行う。
 */
export function useMessageInput(
  _unused: string,
  branchId: string,
  latestMessageId: string | null,
  messages: Message[],
  setMessages: (messages: Message[]) => void,
  modelId: string,
) {
  /** ストリーミング中のアシスタント応答（途中経過） */
  const [streamingText, setStreamingText] = useState("");
  /** アンマウント時にストリームを中断するためのコントローラー */
  const abortRef = useRef<AbortController | null>(null);

  // アンマウント時に進行中のストリームを中断する
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    async (
      promptText: string,
      promptFile?: { data: string; mimeType: string },
    ) => {
      if (latestMessageId === null) {
        throw new Error("メッセージを送信できませんでした");
      }

      setStreamingText("");

      const iterator = await client.chat.branch.sendMessage({
        promptText,
        promptFile,
        branchId: branchId as string,
        latestMessageId,
        modelId,
      });

      // 中断時に for await を抜けるため、シグナルを監視する
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of iterator) {
          if (controller.signal.aborted) break;

          if (event.type === "delta") {
            // テキスト差分を追記して途中経過を表示する
            setStreamingText((prev) => prev + event.text);
            continue;
          }

          if (event.type === "done") {
            // 保存済みのレコードで確定する
            setMessages([...messages, event.message]);
          }
        }
      } finally {
        abortRef.current = null;
        // 確定後は途中経過を破棄する（中断時も同様にクリアする）
        setStreamingText("");
      }

      await new Promise((r) => setTimeout(r, 450));
    },
    [branchId, latestMessageId, messages, setMessages, modelId],
  );

  const { onSend, toast, setToast, ...rest } = useMessageInputBase(sendMessage);

  return {
    onSend,
    toast,
    setToast,
    ...rest,
    /** ストリーミング中のアシスタント応答（確定前）。空文字なら未ストリーミング */
    streamingText,
    messages,
  };
}
