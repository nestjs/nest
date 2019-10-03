import { Controller, Scope } from '@nestjs/common';

@Controller({
  path: 'test',
  scope: Scope.REQUEST,
})
export class ScopedController {}
