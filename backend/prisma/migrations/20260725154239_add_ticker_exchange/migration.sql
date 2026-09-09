/*
  Warnings:

  - Added the required column `exchange` to the `asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticker` to the `asset` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "asset_name_key";

-- AlterTable
ALTER TABLE "asset" ADD COLUMN     "exchange" TEXT NOT NULL,
ADD COLUMN     "ticker" TEXT NOT NULL;
