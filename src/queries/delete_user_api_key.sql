-- ユーザーの API キーを削除する
delete from user_api_key
where user_id = :user_id and provider = :provider
