// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // <-- Caminho corrigido (..)
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [
    ConfigModule, // O ConfigModule que o app.module tornou global
    
    // Isso resolve a dependência circular (Auth -> User, User -> Auth)
    forwardRef(() => UsersModule), 
    
    PassportModule,
    JwtModule.registerAsync({ 
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, 
      }),
    }),
  ],
  controllers: [AuthController],

  providers: [AuthService, JwtStrategy, LocalStrategy],

  
  // Isso torna o "Porteiro" (AuthGuard) utilizável por outros módulos
  exports: [PassportModule, JwtModule], 
})
export class AuthModule {}