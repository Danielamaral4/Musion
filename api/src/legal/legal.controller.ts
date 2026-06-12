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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
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

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/delete-account-requests')
  listDataDeletionRequests(@Query('status') status = 'PENDING') {
    return this.legalService.listDataDeletionRequests(status);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/delete-account-requests/:id/status')
  updateDataDeletionRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.legalService.updateDataDeletionRequestStatus(id, status);
  }
}
