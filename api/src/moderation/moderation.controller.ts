import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { CreateReportDto } from '../dto/create-report.dto';
import { ModerationService } from './moderation.service';

@Controller('moderation')
@UseGuards(AuthGuard('jwt'))
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createReport(@Request() req, @Body() dto: CreateReportDto) {
    return this.moderationService.createReport(req.user.id, dto);
  }

  @Get('blocks')
  listBlocks(@Request() req) {
    return this.moderationService.listBlockedUsers(req.user.id);
  }

  @Post('blocks/:userId')
  blockUser(@Request() req, @Param('userId', ParseIntPipe) userId: number) {
    return this.moderationService.blockUser(req.user.id, userId);
  }

  @Delete('blocks/:userId')
  unblockUser(@Request() req, @Param('userId', ParseIntPipe) userId: number) {
    return this.moderationService.unblockUser(req.user.id, userId);
  }

  @Get('admin/reports')
  @UseGuards(AdminGuard)
  listReports(@Query('status') status = 'PENDING') {
    return this.moderationService.listReports(status);
  }

  @Patch('admin/reports/:id/status')
  @UseGuards(AdminGuard)
  updateReportStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.moderationService.updateReportStatus(id, status);
  }
}
