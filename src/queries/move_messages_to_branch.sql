-- 指定ブランチ群のメッセージを別ブランチへ付け替える（マージ時に使用）
update message
set branch_id = :branch_id::uuid
where branch_id = any(:branch_ids::uuid[])
