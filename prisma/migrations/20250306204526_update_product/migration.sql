/*
  Warnings:

  - Added the required column `filePath` to the `Software` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Software" ADD COLUMN     "filePath" TEXT NOT NULL;
