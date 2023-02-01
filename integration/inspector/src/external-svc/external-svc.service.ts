import { Injectable } from '@nestjs/common';
import { CreateExternalSvcDto } from './dto/create-external-svc.dto';
import { UpdateExternalSvcDto } from './dto/update-external-svc.dto';

@Injectable()
export class ExternalSvcService {
  create(createExternalSvcDto: CreateExternalSvcDto) {
    return 'This action adds a new externalSvc';
  }

  findAll() {
    return `This action returns all externalSvc`;
  }

  findOne(id: number) {
    return `This action returns a #${id} externalSvc`;
  }

  update(id: number, updateExternalSvcDto: UpdateExternalSvcDto) {
    return `This action updates a #${id} externalSvc`;
  }

  remove(id: number) {
    return `This action removes a #${id} externalSvc`;
  }
}
