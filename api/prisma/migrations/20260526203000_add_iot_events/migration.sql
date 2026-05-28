CREATE TABLE `IotEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `albumId` VARCHAR(191) NOT NULL,
  `albumName` VARCHAR(191) NOT NULL,
  `albumCover` TEXT NULL,
  `source` VARCHAR(191) NOT NULL,
  `hexColor` VARCHAR(191) NOT NULL,
  `red` INTEGER NOT NULL,
  `green` INTEGER NOT NULL,
  `blue` INTEGER NOT NULL,
  `isFallback` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `IotEvent_userId_createdAt_idx`(`userId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IotEvent`
  ADD CONSTRAINT `IotEvent_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
