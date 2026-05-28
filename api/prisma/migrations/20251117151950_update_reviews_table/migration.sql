/*
  Warnings:

  - Made the column `albumArtist` on table `Review` required. This step will fail if there are existing NULL values in that column.
  - Made the column `releaseYear` on table `Review` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Review` MODIFY `albumArtist` VARCHAR(191) NOT NULL,
    MODIFY `releaseYear` INTEGER NOT NULL;
