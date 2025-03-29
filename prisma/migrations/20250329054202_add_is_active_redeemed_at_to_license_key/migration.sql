-- AlterTable
ALTER TABLE "LicenseKey" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "redeemedAt" TIMESTAMP(3);
