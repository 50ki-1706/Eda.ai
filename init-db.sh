#!/bin/bash
# postgres コンテナ初回起動時に実行される初期化スクリプト
# gen_random_uuid() は PostgreSQL 13 以降は組み込みだが、
# 環境差異を吸収するため pgcrypto も有効化しておく
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOSQL
