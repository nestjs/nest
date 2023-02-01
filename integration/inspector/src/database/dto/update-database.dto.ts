import { PartialType } from '@nestjs/mapped-types';
import { CreateDatabaseDto } from './create-database.dto';

export class UpdateDatabaseDto extends PartialType(CreateDatabaseDto) {}
