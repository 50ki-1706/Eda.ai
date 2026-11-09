import { useMessageInputBase } from "@/hooks/common/useMessageInputBase";
import { client } from "@/lib/orpc/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ホーム画面の最初のメッセージ送信フック
 *
 * `client.chat.new` は eventIterator を返すため `for await` で消費する。
 * - `delta` イベント: 受信したテキスト差分を `streamingText` に追記する
 * - `done` イベント: 作成された Chat / Branch へ遷移する
 *
 * 途中経過の描画は呼び出し側（HomePage）が
 * `streamingText` と `sending` を参照して行う。
 */
export function useFirstMessageInput(modelId: string) {
  const router = useRouter();

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

  const createChat = useCallback(
    async (
      promptText: string,
      promptFile?: { data: string; mimeType: string },
    ) => {
      setStreamingText("");

      const iterator = await client.chat.new({
        promptText,
        promptFile,
        modelId,
      });

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
            // 作成されたチャットのブランチへ遷移する
            router.push(`/chat/${event.chat.id}/branch/${event.branch.id}`);
          }
        }
      } finally {
        abortRef.current = null;
        setStreamingText("");
      }
    },
    [modelId, router],
  );

  const { onSend, ...rest } = useMessageInputBase(createChat);

  return {
    onSend,
    ...rest,
    /** ストリーミング中のアシスタント応答（確定前）。空文字なら未ストリーミング */
    streamingText,
  };
}
