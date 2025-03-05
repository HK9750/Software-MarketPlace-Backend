/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Software` table. All the data in the column will be lost.
  - You are about to drop the column `isApproved` on the `Software` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Software" DROP COLUMN "deletedAt",
DROP COLUMN "isApproved",
ADD COLUMN     "status" INTEGER NOT NULL DEFAULT 0;
