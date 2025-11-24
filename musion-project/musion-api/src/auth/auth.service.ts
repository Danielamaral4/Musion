// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

interface RegisterDto {
  name: string;       // Nome real, será salvo em displayName
  username: string;   // Username público
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // --- Valida usuário para login ---
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    console.log('DEBUG [validateUser] - User from DB:', user);

    if (user) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  // --- LOGIN ---
  async login(user: any) {
    console.log('DEBUG [login] - User object received:', user);
    const payload = { username: user.username, sub: user.id, id: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // --- REGISTER ---
  async register(dto: any) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(dto.email)) {
    throw new BadRequestException('Formato de email inválido.');
  }

  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(dto.password, salt);

  return this.usersService.create({
    username: dto.username,
    name: dto.name,
    email: dto.email,
    passwordHash,
  });
}

}
