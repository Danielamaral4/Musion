import { Controller, Get, Patch, Param, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@Req() req: any) {
    // Atenção: Certifique-se de que o Guard de autenticação está extraindo req.user.id
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  async readNotification(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }
}
