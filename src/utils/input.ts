/** 送信メッセージの組み立て結果 */
interface MakeInputResult {
  promptText: string;
  /** 添付ファイル（最大 1 件。添付なしなら undefined） */
  promptFile: { data: string; mimeType: string } | undefined;
}

/**
 * 入力欄のテキストと添付ファイルから、送信するメッセージを組み立てる
 *
 * 添付ファイルは Base64 に変換し、MIME タイプとあわせて 1 件だけ送る
 * （コントラクトの `promptFileSchema` に合わせる）。
 *
 * @param text - 入力欄のテキスト
 * @param files - 添付中のファイル（最大 1 件）
 * @param handleEncodedFiles - ファイルを Base64 へ変換する関数
 */
export const makeInput = async (
  text: string,
  files: File[] | null,
  handleEncodedFiles: (files: File[] | null) => Promise<string[] | null>,
): Promise<MakeInputResult> => {
  const file = files?.[0];
  if (!file) {
    return { promptText: text, promptFile: undefined };
  }

  const encoded = await handleEncodedFiles([file]);
  const data = encoded?.[0];

  return {
    promptText: text,
    promptFile: data ? { data, mimeType: file.type } : undefined,
  };
};
