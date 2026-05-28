import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty({ message: 'O texto do comentário não pode estar vazio.' })
  @IsString()
  @MaxLength(500, { message: 'O comentário pode ter no máximo 500 caracteres.' })
  text!: string;
}