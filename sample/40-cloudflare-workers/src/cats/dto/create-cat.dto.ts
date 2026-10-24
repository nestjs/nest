import { IsInt, IsString, Min } from 'class-validator';

export class CreateCatDto {
  @IsString()
  readonly name: string;

  @IsInt()
  @Min(0)
  readonly age: number;

  @IsString()
  readonly breed: string;
}
