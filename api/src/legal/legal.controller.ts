import {
  Body,
  Controller,
  Get,
  Header,
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
import { CreateDataDeletionRequestDto } from '../dto/create-data-deletion-request.dto';
import { LegalService } from './legal.service';
import {
  deleteAccountPage,
  deletionSuccessPage,
  privacyPage,
  termsPage,
} from './legal.pages';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy() {
    return privacyPage();
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  terms() {
    return termsPage();
  }

  @Get('delete-account')
  @Header('Content-Type', 'text/html; charset=utf-8')
  deleteAccount() {
    return deleteAccountPage();
  }

  @Post('delete-account-request')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createDataDeletionRequest(@Body() dto: CreateDataDeletionRequestDto) {
    await this.legalService.createDataDeletionRequest(dto);
    return deletionSuccessPage();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/delete-account-requests')
  listDataDeletionRequests(@Request() req, @Query('status') status = 'PENDING') {
    this.assertAdmin(req.user.id);
    return this.legalService.listDataDeletionRequests(status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('admin/delete-account-requests/:id/status')
  updateDataDeletionRequestStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    this.assertAdmin(req.user.id);
    return this.legalService.updateDataDeletionRequestStatus(id, status);
  }

  private assertAdmin(userId: number) {
    const adminIds = String(process.env.MODERATION_ADMIN_USER_IDS || '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id));

    if (!adminIds.includes(userId)) {
      throw new UnauthorizedException('Acesso restrito a administradores.');
    }
  }
}
