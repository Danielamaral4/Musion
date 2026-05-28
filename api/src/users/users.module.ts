// src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common'; // <-- 1. IMPORTAR forwardRef
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryService } from '../cloudinary.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule), // <-- 2. USAR forwardRef AQUI
    NotificationsModule, // <-- 3. ADICIONAR NotificationsModule
    ModerationModule,
  ], 
  controllers: [UsersController],
  providers: [UsersService, CloudinaryService],
  exports: [UsersService],
})
export class UsersModule {}
