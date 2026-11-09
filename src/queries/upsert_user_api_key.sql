-- ユーザーの API キーを登録・更新する（同じプロバイダーは上書き）
insert into user_api_key (user_id, provider, encrypted_key, key_hint)
values (:user_id, :provider, :encrypted_key, :key_hint)
on conflict (user_id, provider) do update
set
  encrypted_key = excluded.encrypted_key,
  key_hint = excluded.key_hint,
  updated_at = now()
returning
  provider,
  key_hint as "keyHint",
  created_at as "createdAt",
  updated_at as "updatedAt"
