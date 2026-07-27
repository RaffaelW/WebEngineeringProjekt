-- CreateEnum
CREATE TYPE "time_frame" AS ENUM ('1min', '1h', '1d', '1w', '1mo');

-- CreateTable
CREATE TABLE "coverage" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "timeframe" "time_frame" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coverage_asset_id_timeframe_idx" ON "coverage"("asset_id", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_asset_id_timeframe_start_end_key" ON "coverage"("asset_id", "timeframe", "start", "end");

-- AddForeignKey
ALTER TABLE "coverage" ADD CONSTRAINT "coverage_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
