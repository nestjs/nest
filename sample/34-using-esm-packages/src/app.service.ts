import { Inject, Injectable } from '@nestjs/common';
import { superJSONProvider, SuperJSON } from './superjson.provider';

@Injectable()
export class AppService {
  constructor(
    @Inject(superJSONProvider.provide)
    private readonly superjson: SuperJSON,
  ) {}

  getHello() {
    const jsonString = this.superjson.stringify({ big: 10n });

    return {
      jsonString,
    };
  }
}
