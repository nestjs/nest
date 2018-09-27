import { Type } from './interfaces';

import { NestFactory } from './factory';

export async function bootstrap(module: Type<any>) {
  const factory = new NestFactory(module);
  await factory.start();
}
