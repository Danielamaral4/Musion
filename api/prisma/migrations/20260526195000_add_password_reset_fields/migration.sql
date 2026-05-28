ALTER TABLE `User`
  ADD COLUMN `passwordResetToken` VARCHAR(191) NULL,
  ADD COLUMN `passwordResetExpires` DATETIME(3) NULL;
