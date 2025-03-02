/*
  Warnings:

  - The values [SELLER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isApproved` on the `Software` table. All the data in the column will be lost.
  - You are about to drop the column `sellerId` on the `Software` table. All the data in the column will be lost.
  - You are about to drop the `SellerProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('CUSTOMER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- DropForeignKey
ALTER TABLE "SellerProfile" DROP CONSTRAINT "SellerProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Software" DROP CONSTRAINT "Software_sellerId_fkey";

-- AlterTable
ALTER TABLE "Software" DROP COLUMN "isApproved",
DROP COLUMN "sellerId";

-- DropTable
DROP TABLE "SellerProfile";
