CREATE TABLE `DataDeletionRequest` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NULL,
  `reason` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `completedAt` DATETIME(3) NULL,

  INDEX `DataDeletionRequest_email_idx`(`email`),
  INDEX `DataDeletionRequest_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
