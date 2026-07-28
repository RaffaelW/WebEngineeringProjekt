/*
  Warnings:

  - A unique constraint covering the columns `[ticker]` on the table `asset` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "asset_ticker_key" ON "asset"("ticker");
