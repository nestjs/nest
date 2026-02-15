import { PartialType } from '@nestjs/mapped-types';
import { CreateDatabaseDto } from './create-database.dto.js';

export class UpdateDatabaseDto extends PartialType(CreateDatabaseDto) {}
