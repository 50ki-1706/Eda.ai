-- メッセージを作成する
insert into message (prompt_text, prompt_file, parent_id, response, branch_id)
values (:prompt_text, :prompt_file, :parent_id, :response, :branch_id::uuid)
returning
  id,
  prompt_text as "promptText",
  prompt_file as "promptFile",
  parent_id as "parentId",
  response,
  branch_id as "branchId",
  created_at as "createdAt"
