/*
  Warnings:

  - You are about to drop the column `orderItemId` on the `LicenseKey` table. All the data in the column will be lost.
  - You are about to drop the column `softwareId` on the `LicenseKey` table. All the data in the column will be lost.
  - Added the required column `softwareSubscriptionId` to the `LicenseKey` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LicenseKey" DROP CONSTRAINT "LicenseKey_orderItemId_fkey";

-- DropForeignKey
ALTER TABLE "LicenseKey" DROP CONSTRAINT "LicenseKey_softwareId_fkey";

-- AlterTable
ALTER TABLE "LicenseKey" DROP COLUMN "orderItemId",
DROP COLUMN "softwareId",
ADD COLUMN     "softwareSubscriptionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "LicenseKey" ADD CONSTRAINT "LicenseKey_softwareSubscriptionId_fkey" FOREIGN KEY ("softwareSubscriptionId") REFERENCES "SoftwareSubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
