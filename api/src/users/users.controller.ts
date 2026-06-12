// src/users/users.controller.ts
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Patch,
  Body,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Post,
  Delete,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { CloudinaryService } from '../cloudinary.service'; // <-- IMPORTE O SERVIÇO

@Controller('users')
export class UsersController {
  // Injete o CloudinaryService no construtor
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService, 
  ) {}

  @Get('public/search')
  async publicSearch(@Query('q') query: string) {
    return this.usersService.searchUsers(query, null);
  }

  @Get('public/profile/:id')
  async getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findProfile(id, null);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async search(@Query('q') query: string, @Request() req) {
    return this.usersService.searchUsers(query, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateMyProfile(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/password')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async changeMyPassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async deleteMyAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(req.user.id, dto.password);
  }

  // --- ROTA DE UPLOAD ATUALIZADA ---
  @UseGuards(AuthGuard('jwt'))
  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file')) // <-- REMOVEMOS o diskStorage. O padrão é memória.
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    // 1. Envia para o Cloudinary
    const result = await this.cloudinaryService.uploadImage(file).catch((err: any) => { // <-- Corrigido!
    console.error('🚨 ERRO DETALHADO DO CLOUDINARY:', err);
    throw new BadRequestException('Erro ao enviar imagem para o Cloudinary');
});

    // 2. O Cloudinary retorna a URL segura (https)
    const avatarUrl = result.secure_url;

    // 3. Salva a URL no banco de dados
    return this.usersService.updateAvatar(req.user.id, avatarUrl);
  }
  // --- FIM ---

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/users')
  async listUsersForAdmin(
    @Query('q') query = '',
    @Query('role') role = 'ALL'
  ) {
    return this.usersService.listUsersForAdmin(query, role);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/users/:id/role')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: string
  ) {
    return this.usersService.updateUserRole(id, role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/followers')
  async getFollowers(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getFollowers(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/following')
  async getFollowing(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getFollowing(id);
  }

  // Rota para ver o perfil de QUALQUER pessoa
  // Ex: GET http://localhost:3000/users/profile/5
  @UseGuards(AuthGuard('jwt'))
  @Get('profile/:id')
  async getProfile(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.usersService.findProfile(id, req.user.id);
  }

  // Rota para SEGUIR
  // Ex: POST http://localhost:3000/users/5/follow
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  async follow(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.usersService.followUser(req.user.id, id);
  }

  // Rota para DEIXAR DE SEGUIR
  // Ex: DELETE http://localhost:3000/users/5/follow
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/follow')
  async unfollow(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.usersService.unfollowUser(req.user.id, id);
  }
  
}
