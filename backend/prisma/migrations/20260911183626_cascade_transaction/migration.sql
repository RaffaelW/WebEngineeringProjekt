-- DropForeignKey
ALTER TABLE "portfolio-transaction" DROP CONSTRAINT "portfolio-transaction_app_user_id_fkey";

-- AddForeignKey
ALTER TABLE "portfolio-transaction" ADD CONSTRAINT "portfolio-transaction_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app-user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
