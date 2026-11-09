import type { CatalogModel } from "@/app/api/(LLM)/catalog";
import type { ApiKeyProvider } from "@/constants/models";
import { sendKeyMapping } from "@/utils/keyMapping";
import { Paperclip, Send, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import styles from "./MessageInputBar.module.css";
import ModelPicker from "./ModelPicker";

interface MessageInputBarProps {
  text: string;
  setText: (text: string) => void;
  sending: boolean;
  files: File[] | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSend: () => void;
  openPicker: () => void;
  onPicked: (e: ChangeEvent<HTMLInputElement>) => void;
  clearFile: () => void;
  /** 選択中のモデル ID */
  modelId: string;
  /** モデル変更ハンドラー */
  onModelChange: (modelId: string) => void;
  /** プロバイダーごとの API キー登録状況 */
  modelAvailability: Array<{ provider: ApiKeyProvider; registered: boolean }>;
  /** プロバイダーから取得した最新のモデル一覧 */
  models: CatalogModel[];
  /** 外側のレイアウト調整用クラス */
  className?: string;
}

export default function MessageInputBar({
  text,
  setText,
  sending,
  files,
  fileInputRef,
  onSend,
  openPicker,
  onPicked,
  clearFile,
  modelId,
  onModelChange,
  modelAvailability,
  models,
  className,
}: MessageInputBarProps) {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`.trim()}>
      <div className={styles.metaRow}>
        <ModelPicker
          modelId={modelId}
          onModelChange={onModelChange}
          availability={modelAvailability}
          models={models}
        />
      </div>
      {files && files.length > 0 && (
        <div className={styles.fileRow}>
          <span className={styles.fileChip} title={files[0].name}>
            <span className={styles.fileName}>{files[0].name || ""}</span>
            <button
              type="button"
              className={styles.fileRemove}
              aria-label="添付ファイルを削除"
              onClick={clearFile}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        </div>
      )}
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.toolButton}
          aria-label="ファイルを添付"
          title="ファイルを添付"
          onClick={openPicker}
        >
          <Paperclip size={18} aria-hidden="true" />
        </button>
        <textarea
          className={styles.textarea}
          aria-label="message input"
          placeholder="メッセージを入力…"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => sendKeyMapping(e.nativeEvent, onSend)}
          disabled={sending}
        />
        <button
          type="button"
          className={styles.sendButton}
          aria-label="send message"
          onClick={onSend}
          disabled={!text.trim() && !files}
        >
          {sending ? (
            <span className="eda-spinner" aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      <input ref={fileInputRef} type="file" hidden onChange={onPicked} />
    </div>
  );
}
