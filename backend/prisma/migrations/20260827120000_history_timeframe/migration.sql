-- The history table stored bars of every timeframe under a unique key of
-- (asset_id, time), so a 1d bar and a 1min bar sharing a timestamp collided and
-- createMany silently dropped the second one. Reads filtered on a `timeframe`
-- column which never existed. Both tables are a cache that is refetched on demand,
-- and the rows currently in them are of unknown timeframe, so they are dropped
-- rather than guessed at.
DELETE FROM "coverage";
DELETE FROM "history";

-- DropIndex
DROP INDEX "history_asset_id_time_key";

-- AlterTable
ALTER TABLE "history" ADD COLUMN "timeframe" "time_frame" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "history_asset_id_timeframe_time_key" ON "history"("asset_id", "timeframe", "time");
