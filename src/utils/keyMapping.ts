/**
 * 送信ショートカット（Ctrl / Cmd + Enter）を判定してハンドラーを呼ぶ
 *
 * IME 変換中の Enter で誤送信しないよう、`isComposing` の間は無視する。
 */
export const sendKeyMapping = (e: KeyboardEvent, handleSend: () => void) => {
  if (e.isComposing) return;

  const isMac = navigator.userAgent.toLowerCase().includes("mac");
  const withCmd = isMac ? e.metaKey : e.ctrlKey;

  if (e.key === "Enter" && withCmd) {
    e.preventDefault();
    handleSend();
  }
};
