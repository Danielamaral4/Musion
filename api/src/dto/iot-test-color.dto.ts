import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class IotTestColorDto {
  @IsInt()
  @Min(0)
  @Max(255)
  red: number;

  @IsInt()
  @Min(0)
  @Max(255)
  green: number;

  @IsInt()
  @Min(0)
  @Max(255)
  blue: number;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  albumName?: string;
}
