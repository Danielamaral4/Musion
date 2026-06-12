import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../auth/admin.guard';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

@Module({
  imports: [PrismaModule],
  controllers: [LegalController],
  providers: [LegalService, AdminGuard],
})
export class LegalModule {}
