// src/auth/auth.controller.ts (VERSÃO CORRIGIDA)

import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Rota de Registro (CORRIGIDA)
   * Recebe os dados do formulário e chama o 'register' no serviço.
   */
  @Post('register') // Mudei de 'signup' para 'register' para consistência
  async register(@Body() dto: any) { // (Depois você pode criar um DTO)
    return this.authService.register(dto);
  }

  /**
   * Rota de Login (CORRIGIDA)
   * Usa o 'local' guard para validar email/senha
   */
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    // 'req.user' agora é o usuário válido (com ID) vindo da LocalStrategy
    return this.authService.login(req.user);
  }

  // (Sua rota de teste de perfil. Pode manter ou remover)
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req) {
    return req.user;
  }
}