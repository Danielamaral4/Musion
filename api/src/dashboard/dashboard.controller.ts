import { Controller, Get, Request, UseGuards, Param, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // --- DASHBOARD PRINCIPAL ---
  @Get('public')
  getPublicDashboard() {
    return this.dashboardService.getDashboardData(null);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getDashboard(@Request() req) {
    return this.dashboardService.getDashboardData(req.user.id);
  }

  // --- FEED ---
  @UseGuards(AuthGuard('jwt'))
  @Get('feed')
  getFeed(@Request() req) {
    return this.dashboardService.getFeed(req.user.id);
  }

  // --- CURTIR REVIEW ---
  @UseGuards(AuthGuard('jwt'))
  @Post('review/:id/like')
  toggleLike(@Request() req, @Param('id') reviewId: string) {
    return this.dashboardService.toggleLike(req.user.id, Number(reviewId));
  }

  // --- RECOMENDAÇÕES ---
  
  // Recomendação por curtidas
  @UseGuards(AuthGuard('jwt'))
  @Get('recommend/likes')
  async recommendLikes(@Request() req) {
    return this.dashboardService.recommendByLikes(req.user.id);
  }

  // Recomendação por gênero
  @UseGuards(AuthGuard('jwt'))
  @Get('recommend/genre')
  async recommendByGenre(@Request() req) {
    return this.dashboardService.recommendByGenre(req.user.id);
  }

  // Recomendação baseada no último álbum avaliado
  @UseGuards(AuthGuard('jwt'))
  @Get('recommend/last')
  async recommendLast(@Request() req) {
    return this.dashboardService.recommendLast(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('recommend/recent')
  async recommendRecent(@Request() req) {
    return this.dashboardService.recommendRecent(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('recommend/second')
  async recommendSecond(@Request() req) {
    return this.dashboardService.recommendSecond(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('recommend/third')
  async recommendThird(@Request() req) {
    return this.dashboardService.recommendThird(req.user.id);
  }

  
}
