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
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findAllMyReviews(@Request() req) {
    return this.reviewsService.findAllByUserId(req.user.id);
  }

  @Get('public/album/:albumId')
  getPublicReviewsByAlbum(@Param('albumId') albumId: string) {
    return this.reviewsService.findAllByAlbumId(albumId, null);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('album/:albumId')
  getReviewsByAlbum(@Param('albumId') albumId: string, @Request() req) {
    return this.reviewsService.findAllByAlbumId(albumId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.findOneById(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.remove(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/comments')
  async getComments(@Param('id') id: string, @Request() req) {
    return this.reviewsService.getComments(+id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Request() req,
    @Body('text') text: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.reviewsService.addComment(+id, userId, text);
  }
}
