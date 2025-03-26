/*
  Warnings:

  - You are about to drop the column `softwareId` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `softwareId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `softwareId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Software` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `softwareId` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `subscriptionId` to the `Cart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriptionId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_softwareId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_softwareId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_softwareId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionPlan" DROP CONSTRAINT "SubscriptionPlan_softwareId_fkey";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "softwareId",
ADD COLUMN     "subscriptionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "softwareId";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "softwareId",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "subscriptionId";

-- AlterTable
ALTER TABLE "Software" DROP COLUMN "price";

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "price",
DROP COLUMN "softwareId";

-- DropTable
DROP TABLE "Subscription";

-- CreateTable
CREATE TABLE "SoftwareSubscriptionPlan" (
    "id" TEXT NOT NULL,
    "softwareId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftwareSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoftwareSubscriptionPlan_softwareId_subscriptionPlanId_key" ON "SoftwareSubscriptionPlan"("softwareId", "subscriptionPlanId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SoftwareSubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SoftwareSubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareSubscriptionPlan" ADD CONSTRAINT "SoftwareSubscriptionPlan_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "Software"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareSubscriptionPlan" ADD CONSTRAINT "SoftwareSubscriptionPlan_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
