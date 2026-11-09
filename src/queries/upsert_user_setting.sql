-- ユーザーが選択したモデルを保存する（未設定なら作成）
insert into user_setting (user_id, model_id)
values (:user_id, :model_id)
on conflict (user_id) do update
set
  model_id = excluded.model_id,
  updated_at = now()
returning
  model_id as "modelId",
  updated_at as "updatedAt"
