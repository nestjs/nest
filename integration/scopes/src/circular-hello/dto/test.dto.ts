import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class TestDto {
  @IsString()
  @IsNotEmpty()
  string: string;

  @IsNumber()
  number: number;
}
