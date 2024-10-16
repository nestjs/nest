import { Injectable, Scope } from '@nestjs/common';
import { EagerService } from './eager.module';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  constructor(private eagerService: EagerService) {}

  eager() {
    return this.eagerService.sayHello();
  }
}
