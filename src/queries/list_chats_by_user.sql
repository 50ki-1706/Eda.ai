-- ユーザーが所有するチャット一覧を取得する（ピン留め優先）
select
  id,
  summary,
  is_pinned as "isPinned",
  user_id as "userId",
  created_at as "createdAt",
  updated_at as "updatedAt"
from chat
where user_id = :user_id
order by is_pinned desc, created_at desc
