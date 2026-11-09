import { fileToBase64 } from "@/utils/encode";
import { makeInput } from "@/utils/input";
import { useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";

/** 添付できるファイルの上限サイズ（5MB） */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface MessageInputBaseReturn {
  text: string;
  setText: (text: string) => void;
  sending: boolean;
  /** 添付中のファイル（最大 1 件） */
  files: File[] | null;
  toast: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSend: () => Promise<void>;
  openPicker: () => void;
  onPicked: (e: ChangeEvent<HTMLInputElement>) => void;
  clearFile: () => void;
  setToast: (message: string | null) => void;
  /** ストリーミング中に送信したユーザーのプロンプト（確定前の吹き出し表示用） */
  streamingPrompt: string;
}

export function useMessageInputBase(
  onSendMessage: (
    promptText: string,
    promptFile?: { data: string; mimeType: string },
  ) => Promise<void>,
): MessageInputBaseReturn {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 送信直後に確定前のユーザー発言を表示するため、送信内容を保持しておく
  const [streamingPrompt, setStreamingPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 添付ファイルを Base64 へ変換する（失敗時はトーストを出して null を返す） */
  const handleEncodedFiles = async (
    files: File[] | null,
  ): Promise<string[] | null> => {
    if (!files) return null;
    try {
      return await fileToBase64(files);
    } catch (error) {
      console.error(error);
      setToast(
        error instanceof Error
          ? error.message
          : "ファイルのエンコードに失敗しました",
      );
      return null;
    }
  };

  const handleSend = async () => {
    const payload = text.trim();
    if (!payload && !files) {
      setToast("テキストまたはファイルを入力してください");
      return;
    }
    try {
      setSending(true);
      // 入力欄をクリアしても確定前の吹き出しを出せるよう、送信内容を控えておく
      setStreamingPrompt(payload);

      const { promptText, promptFile } = await makeInput(
        text,
        files,
        handleEncodedFiles,
      );

      await onSendMessage(promptText, promptFile);

      setText("");
      setFiles(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "送信に失敗しました");
    } finally {
      setSending(false);
      setStreamingPrompt("");
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const onPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setToast("ファイルサイズは5MB以内にしてください");
      return;
    }
    setFiles([file]);
    setToast(`添付: ${file.name}`);
    // 同じファイルを選び直しても change が発火するよう、値をリセットする
    e.target.value = "";
  };

  const clearFile = () => setFiles(null);

  return {
    text,
    setText,
    sending,
    files,
    toast,
    fileInputRef,
    onSend: handleSend,
    openPicker,
    onPicked,
    clearFile,
    setToast,
    streamingPrompt,
  };
}
