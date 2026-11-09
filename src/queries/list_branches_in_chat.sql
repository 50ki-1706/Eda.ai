-- チャット内の全ブランチを作成順で一括取得する（N+1 回避）
select
  id,
  summary,
  parent_branch_id as "parentBranchId",
  chat_id as "chatId",
  created_at as "createdAt"
from branch
where chat_id = :chat_id::uuid
order by created_at asc
