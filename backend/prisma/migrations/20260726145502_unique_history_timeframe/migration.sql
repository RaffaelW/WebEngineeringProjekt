/*
  Warnings:

  - A unique constraint covering the columns `[asset_id,time]` on the table `history` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "history_time_key";

-- CreateIndex
CREATE UNIQUE INDEX "history_asset_id_time_key" ON "history"("asset_id", "time");
