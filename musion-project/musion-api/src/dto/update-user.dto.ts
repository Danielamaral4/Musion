// src/users/dto/update-user.dto.ts
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(30)
  // TODO: Adicionar validação de regex (só letras/números) se quiser
  username?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;
}