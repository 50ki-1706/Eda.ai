-- ブランチを作成する（親ブランチは新規チャットの場合 null）
insert into branch (summary, parent_branch_id, chat_id)
values (:summary, :parent_branch_id, :chat_id::uuid)
returning
  id,
  summary,
  parent_branch_id as "parentBranchId",
  chat_id as "chatId",
  created_at as "createdAt"
