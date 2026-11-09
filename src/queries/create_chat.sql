-- チャットを作成する
insert into chat (summary, user_id)
values (:summary, :user_id)
returning
  id,
  summary,
  is_pinned as "isPinned",
  user_id as "userId",
  created_at as "createdAt",
  updated_at as "updatedAt"
