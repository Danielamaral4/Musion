CREATE TABLE `UserBlock` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `blockerId` INTEGER NOT NULL,
  `blockedId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `UserBlock_blockerId_blockedId_key`(`blockerId`, `blockedId`),
  INDEX `UserBlock_blockedId_idx`(`blockedId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Report` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `reporterId` INTEGER NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId` INTEGER NOT NULL,
  `targetUserId` INTEGER NULL,
  `reason` VARCHAR(191) NOT NULL,
  `details` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,

  UNIQUE INDEX `Report_reporterId_targetType_targetId_key`(`reporterId`, `targetType`, `targetId`),
  INDEX `Report_targetType_targetId_idx`(`targetType`, `targetId`),
  INDEX `Report_targetUserId_idx`(`targetUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserBlock`
  ADD CONSTRAINT `UserBlock_blockerId_fkey`
  FOREIGN KEY (`blockerId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserBlock`
  ADD CONSTRAINT `UserBlock_blockedId_fkey`
  FOREIGN KEY (`blockedId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Report`
  ADD CONSTRAINT `Report_reporterId_fkey`
  FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Report`
  ADD CONSTRAINT `Report_targetUserId_fkey`
  FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
