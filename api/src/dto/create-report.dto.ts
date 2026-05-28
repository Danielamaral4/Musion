import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateReportDto {
  @IsIn(['USER', 'REVIEW', 'COMMENT'])
  targetType: 'USER' | 'REVIEW' | 'COMMENT';

  @IsInt()
  @Min(1)
  targetId: number;

  @IsString()
  @MaxLength(50)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
