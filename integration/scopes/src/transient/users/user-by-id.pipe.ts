import { Injectable, PipeTransform, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor() {
    UserByIdPipe.COUNTER++;
  }

  transform(value: string) {
    return value;
  }
}
