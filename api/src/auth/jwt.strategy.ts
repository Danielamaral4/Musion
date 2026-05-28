// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET não está definido no arquivo .env');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // O "PORTEIRO"
  async validate(payload: any) {
    // O payload é: { username: 'daniel', sub: 1 }
    
    if (!payload.sub) {
      // Se o token for antigo/quebrado e não tiver o 'sub'
      throw new UnauthorizedException('Token inválido ou antigo. Faça o login novamente.');
    }

    // Se passou, sabemos que payload.sub existe e é o ID.
    return { 
      id: payload.sub, // <-- Transforma 'sub' (lido) em 'id' (para o controller)
      username: payload.username 
    };
  }
}