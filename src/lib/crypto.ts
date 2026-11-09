import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * ユーザーが登録した API キーの暗号化・復号ユーティリティ
 *
 * - 方式: AES-256-GCM（認証付き暗号化。改ざん検知付き）
 * - 鍵: 環境変数 `API_KEY_ENCRYPTION_SECRET` を SHA-256 で 32 バイトに正規化
 * - 保存形式: `v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>`
 *
 * 平文のキーは DB に保存せず、復号した値はリクエスト処理中のみメモリに保持する。
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";

/** 暗号化に使う 32 バイト鍵を導出する */
const deriveKey = (): Buffer => {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET が設定されていません。.env に 32 文字以上のランダムな文字列を設定してください。",
    );
  }
  // 任意長のシークレットを AES-256 用の 32 バイト鍵に変換する
  return createHash("sha256").update(secret, "utf8").digest();
};

/** 平文の API キーを暗号化して保存用の文字列を返す */
export const encryptApiKey = (plainText: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
};

/** 保存された暗号文から平文の API キーを復元する */
export const decryptApiKey = (encrypted: string): string => {
  const [version, ivBase64, authTagBase64, ciphertextBase64] =
    encrypted.split(":");

  if (version !== VERSION || !ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("API キーの暗号文の形式が不正です。");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

/**
 * UI 表示用のキーのヒントを作る（例: `sk-or-…a1b2`）
 * キー全体は返さず、先頭と末尾の数文字だけを残す
 */
export const createKeyHint = (plainText: string): string => {
  const trimmed = plainText.trim();
  if (trimmed.length <= 8) return "…";
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};
