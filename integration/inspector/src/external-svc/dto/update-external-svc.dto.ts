import { PartialType } from '@nestjs/mapped-types';
import { CreateExternalSvcDto } from './create-external-svc.dto.js';

export class UpdateExternalSvcDto extends PartialType(CreateExternalSvcDto) {
  id: number;
}
