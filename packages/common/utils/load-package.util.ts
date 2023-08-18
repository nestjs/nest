// @ts-ignore:next-line
import type * as Ws from 'ws';
// @ts-ignore:next-line
import type * as Mqtt from 'mqtt';
// @ts-ignore:next-line
import type * as Nats from 'nats';
// @ts-ignore:next-line
import type * as GrpcJs from '@grpc/grpc-js';
// @ts-ignore:next-line
import type * as Amqplib from 'amqplib';
// @ts-ignore:next-line
import type * as IORedis from 'ioredis';
// @ts-ignore:next-line
import type * as KafkaJs from 'kafkajs';
// @ts-ignore:next-line
import type * as FastifyView from '@fastify/view';
// @ts-ignore:next-line
import type * as FastifyStatic from '@fastify/static';
// @ts-ignore:next-line
import type * as ClassValidator from 'class-validator';
// @ts-ignore:next-line
import type * as ReflectMetadata from 'reflect-metadata';
// @ts-ignore:next-line
import type * as ClassTransformer from 'class-transformer';
// @ts-ignore:next-line
import type * as AmqplibConnManager from 'amqp-connection-manager';

import { Logger } from '../services/logger.service';

const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`;

const logger = new Logger('PackageLoader');

type KnownPackages =
  | { name: 'ws'; exports: typeof Ws }
  | { name: 'mqtt'; exports: typeof Mqtt }
  | { name: 'nats'; exports: typeof Nats }
  | { name: 'amqplib'; exports: typeof Amqplib }
  | { name: 'ioredis'; exports: typeof IORedis }
  | { name: 'kafkajs'; exports: typeof KafkaJs }
  | { name: '@grpc/grpc-js'; exports: typeof GrpcJs }
  | { name: '@fastify/view'; exports: typeof FastifyView }
  | { name: '@fastify/static'; exports: typeof FastifyStatic }
  | { name: 'class-validator'; exports: typeof ClassValidator }
  | { name: 'reflect-metadata'; exports: typeof ReflectMetadata }
  | { name: 'class-transformer'; exports: typeof ClassTransformer }
  | { name: 'amqp-connection-manager'; exports: typeof AmqplibConnManager };

type UnknownPackagesNames = Exclude<string, KnownPackages['name']>;

export function loadPackage<
  T extends KnownPackages['name'] | UnknownPackagesNames,
>(
  packageName: T,
  context: string,
  loaderFn?: Function,
): T extends KnownPackages['name']
  ? Extract<KnownPackages, { name: T }>['exports']
  : any {
  try {
    return loaderFn ? loaderFn() : require(packageName);
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}
