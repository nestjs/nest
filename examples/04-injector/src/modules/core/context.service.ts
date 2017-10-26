import { CommonService } from '../common/common.service';
import { CoreService } from './core.service';
import { Component } from '';

@Component()
export class ContextService {
  constructor(private readonly commonService: CoreService) {
    console.log('ContextService', commonService);
  }
}
