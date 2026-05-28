import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDataDeletionRequestDto {
  @IsEmail()
  @MaxLength(191)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
