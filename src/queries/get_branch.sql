-- ID で単一のブランチを取得する
select
  id,
  summary,
  parent_branch_id as "parentBranchId",
  chat_id as "chatId",
  created_at as "createdAt"
from branch
where id = :id::uuid
