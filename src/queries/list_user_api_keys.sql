-- ユーザーの API キー一覧を取得する（キー本体は返さずヒントのみ）
select
  provider,
  key_hint as "keyHint",
  created_at as "createdAt",
  updated_at as "updatedAt"
from user_api_key
where user_id = :user_id
order by created_at asc
