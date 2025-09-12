import { fileToBase64 } from "@/utils/encode";
import { makeInput } from "@/utils/input";
import { useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";

interface MessageInputBaseReturn {
  text: string;
  setText: (text: string) => void;
  sending: boolean;
  files: File[] | null;
  toast: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSend: () => Promise<void>;
  openPicker: () => void;
  onPicked: (e: ChangeEvent<HTMLInputElement>) => void;
  clearFile: () => void;
  setToast: (message: string | null) => void;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleEncodedFiles = async (
    files: File[] | null,
  ): Promise<string[] | null> => {
    if (!files) return null;
    try {
      const encodedFiles: string[] = await fileToBase64(files);
      return encodedFiles;
    } catch (error) {
      console.error(error);
      setToast(
        error instanceof Error
          ? error.message
          : "ファイルのエンコードに失敗しました",
      );
    }
    return null;
  };

  const handleSend = async () => {
    const payload = text.trim();
    if (!payload && !files) {
      setToast("テキストまたはファイルを入力してください");
      return;
    }
    try {
      setSending(true);
      const { promptText, promptFiles } = await makeInput(
        text,
        files,
        handleEncodedFiles,
      );

      await onSendMessage(promptText, promptFiles?.[0]);

      setText("");
      setFiles(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const onPicked = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_FILE_SIZE) {
      setToast("ファイルサイズは5MB以内にしてください");
      return;
    }
    setFiles((prev) => [...(prev || []), f]);
    setToast(`添付: ${f.name}`);
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
  };
}
