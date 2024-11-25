import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateExternalSvcDto } from './dto/create-external-svc.dto';
import { UpdateExternalSvcDto } from './dto/update-external-svc.dto';
import { ExternalSvcService } from './external-svc.service';

@Controller()
export class ExternalSvcController {
  constructor(private readonly externalSvcService: ExternalSvcService) {}

  @MessagePattern('createExternalSvc')
  create(@Payload() createExternalSvcDto: CreateExternalSvcDto) {
    return this.externalSvcService.create(createExternalSvcDto);
  }

  @MessagePattern('findAllExternalSvc')
  findAll() {
    return this.externalSvcService.findAll();
  }

  @MessagePattern('findOneExternalSvc')
  findOne(@Payload() id: number) {
    return this.externalSvcService.findOne(id);
  }

  @MessagePattern('updateExternalSvc')
  update(@Payload() updateExternalSvcDto: UpdateExternalSvcDto) {
    return this.externalSvcService.update(
      updateExternalSvcDto.id,
      updateExternalSvcDto,
    );
  }

  @MessagePattern('removeExternalSvc')
  remove(@Payload() id: number) {
    return this.externalSvcService.remove(id);
  }
}
