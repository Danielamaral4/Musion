import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // --- CRIAÇÃO ---
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    // CORRIGIDO: Passando a variável 'createReviewDto' (dados), não a Classe
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  // --- MEUS REVIEWS ---
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findAllMyReviews(@Request() req) {
    return this.reviewsService.findAllByUserId(req.user.id);
  }

  // --- ATUALIZAÇÃO ---
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  // --- DELETAR ---
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.remove(id, req.user.id);
  }

  // src/reviews/reviews.controller.ts
@UseGuards(AuthGuard('jwt'))
@Get('album/:albumId')
getReviewsByAlbum(@Param('albumId') albumId: string, @Request() req) {
  return this.reviewsService.findAllByAlbumId(albumId, req.user.id);
}

// --- ROTAS DE COMENTÁRIO ---

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/comments')
  async getComments(@Param('id') id: string, @Request() req) {
    return this.reviewsService.getComments(+id, req.user.id);
  }

  // Use a mesma proteção de rota (Guard) que você já usa nas outras rotas de criação
  @UseGuards(JwtAuthGuard) 
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string, 
    @Request() req, 
    @Body('text') text: string
  ) {
    // req.user.id ou o jeito que você pega o ID do usuário logado no seu projeto
    const userId = req.user.id || req.user.sub; 
    return this.reviewsService.addComment(+id, userId, text);
  }

}
