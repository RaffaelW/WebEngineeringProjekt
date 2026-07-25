/*
  Warnings:

  - The primary key for the `app-user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `app-user` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `asset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `asset` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `history` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `asset_id` on the `history` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `portfolio-transaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `portfolio-transaction` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `app_user_id` on the `portfolio-transaction` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `asset_id` on the `portfolio-transaction` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- DropForeignKey
ALTER TABLE "history" DROP CONSTRAINT "history_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolio-transaction" DROP CONSTRAINT "portfolio-transaction_app_user_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolio-transaction" DROP CONSTRAINT "portfolio-transaction_asset_id_fkey";

-- AlterTable
ALTER TABLE "app-user" DROP CONSTRAINT "app-user_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "app-user_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "asset" DROP CONSTRAINT "asset_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "asset_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "history" DROP CONSTRAINT "history_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ALTER COLUMN "asset_id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "portfolio-transaction" DROP CONSTRAINT "portfolio-transaction_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ALTER COLUMN "app_user_id" SET DATA TYPE INTEGER,
ALTER COLUMN "asset_id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "portfolio-transaction_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "portfolio-transaction" ADD CONSTRAINT "portfolio-transaction_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app-user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio-transaction" ADD CONSTRAINT "portfolio-transaction_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
