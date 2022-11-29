import { PartialType } from '@nestjs/mapped-types';
import { CreateExternalSvcDto } from './create-external-svc.dto';

export class UpdateExternalSvcDto extends PartialType(CreateExternalSvcDto) {
  id: number;
}
