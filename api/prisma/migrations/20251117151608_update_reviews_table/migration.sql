/*
  Warnings:

  - You are about to alter the column `rating` on the `Review` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `Review` ADD COLUMN `albumArtist` VARCHAR(191) NULL,
    ADD COLUMN `releaseYear` INTEGER NULL,
    MODIFY `rating` DOUBLE NOT NULL;
