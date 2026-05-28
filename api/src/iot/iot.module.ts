import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';

@Module({
  imports: [PrismaModule],
  controllers: [IotController],
  providers: [IotService],
})
export class IotModule {}
