-- ID で単一のメッセージを取得する
select
  id,
  prompt_text as "promptText",
  prompt_file as "promptFile",
  parent_id as "parentId",
  response,
  branch_id as "branchId",
  created_at as "createdAt"
from message
where id = :id::uuid
