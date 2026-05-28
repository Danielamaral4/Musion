import { IsOptional, IsString, MaxLength } from 'class-validator';

export class IotAlbumColorDto {
  @IsString()
  @MaxLength(191)
  albumId: string;

  @IsString()
  @MaxLength(191)
  albumName: string;

  @IsOptional()
  @IsString()
  albumCover?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
