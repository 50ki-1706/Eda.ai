"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** テキスト差分イベント（コントラクトの `chatDeltaEventSchema` と同形） */
type DeltaEvent = { type: "delta"; text: string };

/** 差分イベントかどうかを判定する型ガード */
const isDeltaEvent = <DoneEvent extends { type: string }>(
  event: DeltaEvent | DoneEvent,
): event is DeltaEvent => event.type === "delta";

/**
 * ストリーミング手続き（`chat.new` / `chat.branch.sendMessage`）を消費するフック
 *
 * 差分（`delta`）を `streamingText` に追記し、完了イベント（`done`）を
 * `onDone` に渡す。アンマウント時は `for await` を抜けてストリームを中断する。
 *
 * @param onDone - `done` イベントを受け取ったときの処理
 * @returns ストリームを開始する `start` と、途中経過のテキスト
 */
export const useChatStream = <DoneEvent extends { type: string }>(
  onDone: (event: DoneEvent) => void,
) => {
  /** ストリーミング中のアシスタント応答（途中経過） */
  const [streamingText, setStreamingText] = useState("");
  /** アンマウント後に状態更新しないためのフラグ */
  const unmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const start = useCallback(
    async (iteratorPromise: Promise<AsyncIterable<DeltaEvent | DoneEvent>>) => {
      setStreamingText("");
      const iterator = await iteratorPromise;

      try {
        for await (const event of iterator) {
          if (unmountedRef.current) break;

          if (isDeltaEvent(event)) {
            // テキスト差分を追記して途中経過を表示する
            setStreamingText((prev) => prev + event.text);
            continue;
          }

          // delta 以外は完了イベント（コントラクトの判別可能ユニオン）
          onDone(event);
        }
      } finally {
        // 確定後も中断時も、途中経過は破棄する
        if (!unmountedRef.current) setStreamingText("");
      }
    },
    [onDone],
  );

  return { start, streamingText };
};
