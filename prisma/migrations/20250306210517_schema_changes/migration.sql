/*
  Warnings:

  - You are about to drop the column `isApproved` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `avergaeRating` on the `Software` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "isApproved";

-- AlterTable
ALTER TABLE "Software" DROP COLUMN "avergaeRating",
ADD COLUMN     "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
