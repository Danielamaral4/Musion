import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global() // IMPORTANTE: Torna o service global para o Comments poder usá-lo livremente
@Module({
  imports: [PrismaModule], // IMPORTANTE: Importa o PrismaModule para usar o PrismaService
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}