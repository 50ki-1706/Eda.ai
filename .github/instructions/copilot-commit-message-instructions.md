コミットメッセージは Conventional Commits 規約に準拠すること。

## フォーマット

<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

## Type

- `feat`: 新機能の追加
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更(空白、フォーマット、セミコロンの欠落など)
- `refactor`: バグ修正も機能追加もしないコード変更
- `perf`: パフォーマンスを向上させるコード変更
- `test`: 不足しているテストの追加や既存のテストの修正
- `build`: ビルドシステムや外部依存関係に影響する変更(例: npm, webpack)
- `ci`: CI 設定ファイルやスクリプトの変更
- `chore`: その他の変更(src や test ファイルを変更しないもの)
- `revert`: 以前のコミットを取り消す

## 基本ルール

- description は日本語で 50 文字以内とすること。
- 破壊的な変更の場合は、`!`を type の後に追加すること。

## 例

feat: ユーザー認証機能を追加

JWT ベースの認証システムをリフレッシュトークン付きで実装。
