/*
  Warnings:

  - You are about to drop the column `embedding` on the `Chunk` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Chunk" DROP COLUMN "embedding",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
