import type { ApiKeyProvider } from "@/constants/models";
import type { CatalogModel } from "@/types";
import { sendKeyMapping } from "@/utils/keyMapping";
import { ArrowUp, Paperclip, X } from "lucide-react";
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
  /** 入力欄のプレースホルダー */
  placeholder?: string;
}

/**
 * メッセージ入力バー
 *
 * 角丸の大きなカード型コンポーザ。上段にテキスト、下段にツール（添付・モデル）と
 * 送信ボタンを並べ、チャットアプリらしい操作の流れを作る。
 */
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
  placeholder = "メッセージを入力…",
}: MessageInputBarProps) {
  const canSend = (!!text.trim() || !!files) && !sending;

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`.trim()}>
      {files && files.length > 0 && (
        <div className={styles.fileRow}>
          <span className={styles.fileChip} title={files[0].name}>
            <Paperclip size={14} aria-hidden="true" />
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
        <textarea
          className={styles.textarea}
          aria-label="メッセージ入力"
          placeholder={placeholder}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => sendKeyMapping(e.nativeEvent, onSend)}
          disabled={sending}
        />
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button
              type="button"
              className={styles.toolButton}
              aria-label="ファイルを添付"
              title="ファイルを添付"
              onClick={openPicker}
            >
              <Paperclip size={18} aria-hidden="true" />
            </button>
            <ModelPicker
              modelId={modelId}
              onModelChange={onModelChange}
              availability={modelAvailability}
              models={models}
            />
          </div>
          <button
            type="button"
            className={styles.sendButton}
            aria-label="メッセージを送信"
            title="送信（Enter）"
            onClick={onSend}
            disabled={!canSend}
          >
            {sending ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <ArrowUp size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" hidden onChange={onPicked} />
    </div>
  );
}
