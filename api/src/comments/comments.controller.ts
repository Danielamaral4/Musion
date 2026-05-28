import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('reviews/:reviewId/comments')
@UseGuards(AuthGuard('jwt'))
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async create(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Req() req,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    // req.user.id vem do seu token JWT decodificado pelo Guard
    return this.commentsService.create(reviewId, req.user.id, createCommentDto);
  }

  @Get()
  async findAll(@Param('reviewId', ParseIntPipe) reviewId: number, @Req() req) {
    return this.commentsService.findAllByReview(reviewId, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ) {
    return this.commentsService.remove(id, req.user.id);
  }
}
