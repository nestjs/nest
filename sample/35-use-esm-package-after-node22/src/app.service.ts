import { Injectable } from '@nestjs/common';
import superjson from 'superjson';

@Injectable()
export class AppService {
  getJsonStringExample() {
    const jsonString = superjson.stringify({ big: 10n });

    return {
      jsonString,
    };
  }
}
