import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST, RESPONSE } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class ScopedService {
  constructor(
    @Inject(REQUEST) public readonly request,
    @Inject(RESPONSE) public readonly response,
  ) {}
}
