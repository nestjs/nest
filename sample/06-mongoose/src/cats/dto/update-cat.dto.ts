import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateCatDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsNumber()
  age?: number;
}
