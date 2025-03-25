import { Injectable, Scope } from '@nestjs/common';
import { EagerService } from './eager.module';

@Injectable({ scope: Scope.REQUEST })
export class RequestService {
  constructor(private eagerService: EagerService) {}

  eager() {
    return this.eagerService.sayHello();
  }
}
