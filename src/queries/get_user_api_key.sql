-- 指定プロバイダーの暗号化済み API キーを取得する（復号はアプリ層で行う）
select
  encrypted_key as "encryptedKey"
from user_api_key
where user_id = :user_id and provider = :provider
