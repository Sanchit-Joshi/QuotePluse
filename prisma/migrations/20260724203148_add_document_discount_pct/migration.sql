-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "documentDiscountPct" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "documentDiscountPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
