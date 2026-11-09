-- チャットのピン留め状態を更新する
update chat
set is_pinned = :is_pinned::boolean
where id = :chat_id::uuid
returning
  id,
  summary,
  is_pinned as "isPinned",
  user_id as "userId",
  created_at as "createdAt",
  updated_at as "updatedAt"
