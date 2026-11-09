-- ブランチを削除する（配下メッセージは事前に移動済みであること）
delete from branch
where id = :branch_id::uuid
