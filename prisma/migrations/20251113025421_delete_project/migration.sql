/*
  Warnings:

  - You are about to drop the `branch_in_project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_in_project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `message_in_project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."branch_in_project" DROP CONSTRAINT "branch_in_project_chatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."branch_in_project" DROP CONSTRAINT "branch_in_project_parentBranchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."chat_in_project" DROP CONSTRAINT "chat_in_project_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."message_in_project" DROP CONSTRAINT "message_in_project_branchId_fkey";

-- DropForeignKey
ALTER TABLE "public"."message_in_project" DROP CONSTRAINT "message_in_project_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."project" DROP CONSTRAINT "project_userId_fkey";

-- DropTable
DROP TABLE "public"."branch_in_project";

-- DropTable
DROP TABLE "public"."chat_in_project";

-- DropTable
DROP TABLE "public"."message_in_project";

-- DropTable
DROP TABLE "public"."project";
