import { IsString, IsNumber, IsInt, Min, Max, IsNotEmpty, Length, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  albumId: string;

  // --- NOVO CAMPO PARA O ID REAL DO SPOTIFY ---
  @IsString()
  @IsNotEmpty()
  spotifyId: string;

  @IsString()
  @IsNotEmpty()
  albumName: string;

  @IsString()
  @IsNotEmpty()
  albumArtist: string;

  @IsString()
  @IsUrl()
  albumCover: string;

  @IsInt()
  @Min(1000)
  @Type(() => Number)
  releaseYear: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  rating: number;

  @IsString()
  @Length(0, 280)
  text: string;
}
