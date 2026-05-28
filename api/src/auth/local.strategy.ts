// src/auth/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  
  constructor(private authService: AuthService) {
    // Aqui configuramos o "Porteiro"
    // Dizemos a ele que o campo de 'username' na verdade se chama 'email'
    // no corpo (body) da requisição.
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Esta função é chamada automaticamente pelo AuthGuard('local')
   * Ela recebe o email e a senha que o usuário digitou no login.
   */
  async validate(email: string, pass: string): Promise<any> {
    // 1. Usamos a função que JÁ EXISTE no seu auth.service
    const user = await this.authService.validateUser(email, pass);

    // 2. Se o serviço retornou 'null' (usuário não achado ou senha errada)...
    if (!user) {
      // ...nós lançamos o erro que o NestJS entende.
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    
    // 3. Se deu tudo certo, retornamos o usuário.
    // O NestJS vai magicamente injetar isso em 'req.user' no controller.
    return user;
  }
}