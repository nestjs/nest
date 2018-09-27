import { Collection } from '@nest/ipfs';
import { IsString, IsNumber } from 'class-validator';
import { Exclude } from 'class-transformer';

@Collection()
export class UserCollection {
  @IsNumber()
  readonly id?: number;
  @IsString()
  readonly username: string;
  @Exclude()
  @IsString()
  readonly password: string;
}
