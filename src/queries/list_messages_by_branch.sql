-- ブランチ内のメッセージ一覧を時系列順で取得する
select
  id,
  prompt_text as "promptText",
  prompt_file as "promptFile",
  parent_id as "parentId",
  response,
  branch_id as "branchId",
  created_at as "createdAt"
from message
where branch_id = :branch_id::uuid
order by created_at asc
