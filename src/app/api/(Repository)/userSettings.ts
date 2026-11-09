import { db } from "@/lib/db";
import deleteUserApiKey from "@/queries/delete_user_api_key.sql";
import getUserApiKey from "@/queries/get_user_api_key.sql";
import getUserSetting from "@/queries/get_user_setting.sql";
import listUserApiKeys from "@/queries/list_user_api_keys.sql";
import upsertUserApiKey from "@/queries/upsert_user_api_key.sql";
import upsertUserSetting from "@/queries/upsert_user_setting.sql";

/**
 * ユーザー設定（API キー・選択中モデル）の永続化を担当するリポジトリ
 * キーの暗号化・復号は呼び出し側（Controller）で行い、ここでは保存形式を扱わない
 */
export class UserSettingsRepository {
  /** ユーザーの API キー一覧を取得する（キー本体は含まない） */
  listApiKeys = async (userId: string) => {
    return await listUserApiKeys.run(db, { user_id: userId });
  };

  /** 指定プロバイダーの暗号化済みキーを取得する（未登録なら undefined） */
  getEncryptedApiKey = async (userId: string, provider: string) => {
    const row = await getUserApiKey.run(db, {
      user_id: userId,
      provider,
    });
    return row?.encryptedKey;
  };

  /** API キーを登録・更新する */
  upsertApiKey = async (
    userId: string,
    provider: string,
    encryptedKey: string,
    keyHint: string,
  ) => {
    return await upsertUserApiKey.run(db, {
      user_id: userId,
      provider,
      encrypted_key: encryptedKey,
      key_hint: keyHint,
    });
  };

  /** API キーを削除する */
  deleteApiKey = async (userId: string, provider: string) => {
    await deleteUserApiKey.run(db, { user_id: userId, provider });
  };

  /** ユーザーの選択中モデルを取得する（未設定なら undefined） */
  getModelId = async (userId: string) => {
    const row = await getUserSetting.run(db, { user_id: userId });
    return row?.modelId;
  };

  /** ユーザーの選択中モデルを保存する */
  saveModelId = async (userId: string, modelId: string) => {
    return await upsertUserSetting.run(db, {
      user_id: userId,
      model_id: modelId,
    });
  };
}
