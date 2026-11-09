/**
 * アプリケーション全体で使うドメイン型
 * DB は snake_case カラムだが、reylo クエリのエイリアスで camelCase に揃えている
 * createdAt / updatedAt は reylo の型推論上 string（実行時は postgres.js が Date を返す）
 */

export interface Chat {
  id: string;
  summary: string;
  isPinned: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  summary: string;
  parentBranchId: string | null;
  chatId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  promptText: string;
  promptFile: string | null;
  parentId: string | null;
  response: string;
  branchId: string;
  createdAt: string;
}
