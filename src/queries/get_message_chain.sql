-- 再帰 CTE でメッセージの親チェーン（祖先）を一括取得する
-- N+1 回のクエリを 1 回に削減する
with recursive message_chain as (
  select id, prompt_text, prompt_file, parent_id, response, branch_id, created_at
  from message
  where id = :message_id::uuid
  union all
  select m.id, m.prompt_text, m.prompt_file, m.parent_id, m.response, m.branch_id, m.created_at
  from message m
  inner join message_chain mc on m.id = mc.parent_id
)
select
  id,
  prompt_text as "promptText",
  prompt_file as "promptFile",
  parent_id as "parentId",
  response,
  branch_id as "branchId",
  created_at as "createdAt"
from message_chain
order by created_at asc
