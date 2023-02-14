import { PartialType } from '@nestjs/mapped-types';
import { CreateDogDto } from './create-dog.dto';

export class UpdateDogDto extends PartialType(CreateDogDto) {}
