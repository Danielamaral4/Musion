import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IotService } from './iot.service';
import { IotAlbumColorDto } from '../dto/iot-album-color.dto';
import { IotTestColorDto } from '../dto/iot-test-color.dto';

@Controller('iot')
@UseGuards(AuthGuard('jwt'))
export class IotController {
  constructor(private readonly iotService: IotService) {}

  @Post('album-color')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createAlbumColor(@Request() req, @Body() dto: IotAlbumColorDto) {
    return this.iotService.createAlbumColorEvent(req.user.id, dto);
  }

  @Post('led/test')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createTestColor(@Request() req, @Body() dto: IotTestColorDto) {
    return this.iotService.createTestColorEvent(req.user.id, dto);
  }

  @Get('led/state')
  async getCurrentState(@Request() req) {
    return this.iotService.getCurrentState(req.user.id);
  }

  @Get('led/history')
  async getHistory(
    @Request() req,
    @Query('take') take?: string
  ) {
    return this.iotService.getHistory(req.user.id, Number(take) || 20);
  }
}
