-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('buy', 'sell');

-- CreateTable
CREATE TABLE "app-user" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hashPassword" TEXT NOT NULL,

    CONSTRAINT "app-user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cookie" (
    "id" BIGSERIAL NOT NULL,
    "app_user_id" BIGINT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio-transaction" (
    "id" BIGSERIAL NOT NULL,
    "app_user_id" BIGINT NOT NULL,
    "asset_id" BIGINT NOT NULL,
    "transaction_type" "transaction_type" NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "shares_amount" INTEGER NOT NULL,

    CONSTRAINT "portfolio-transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history" (
    "id" BIGSERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "asset_id" BIGINT NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app-user_name_key" ON "app-user"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cookie_value_key" ON "cookie"("value");

-- CreateIndex
CREATE UNIQUE INDEX "asset_name_key" ON "asset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "history_time_key" ON "history"("time");

-- AddForeignKey
ALTER TABLE "cookie" ADD CONSTRAINT "cookie_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app-user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio-transaction" ADD CONSTRAINT "portfolio-transaction_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app-user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio-transaction" ADD CONSTRAINT "portfolio-transaction_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
