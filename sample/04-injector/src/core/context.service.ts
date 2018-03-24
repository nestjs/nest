import { Injectable } from '@nestjs/common';
import { CommonService } from '../common/common.service';
import { CoreService } from './core.service';

@Injectable()
export class ContextService {
  constructor(private readonly commonService: CoreService) {
    console.log('ContextService', commonService);
  }
}
