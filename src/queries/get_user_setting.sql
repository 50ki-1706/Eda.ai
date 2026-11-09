-- ユーザーの設定（選択中モデル）を取得する
select
  model_id as "modelId",
  updated_at as "updatedAt"
from user_setting
where user_id = :user_id
