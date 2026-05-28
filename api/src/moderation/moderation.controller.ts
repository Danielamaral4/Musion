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
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
  listReports(@Request() req, @Query('status') status = 'PENDING') {
    this.assertAdmin(req.user.id);
    return this.moderationService.listReports(status);
  }

  @Patch('admin/reports/:id/status')
  updateReportStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    this.assertAdmin(req.user.id);
    return this.moderationService.updateReportStatus(id, status);
  }

  private assertAdmin(userId: number) {
    const adminIds = String(process.env.MODERATION_ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));

    if (!adminIds.includes(userId)) {
      throw new UnauthorizedException('Acesso restrito a moderadores.');
    }
  }
}
