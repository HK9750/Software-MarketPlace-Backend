-- DropForeignKey
ALTER TABLE "Software" DROP CONSTRAINT "Software_categoryId_fkey";

-- AlterTable
ALTER TABLE "Software" ADD COLUMN     "avergaeRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Software" ADD CONSTRAINT "Software_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
