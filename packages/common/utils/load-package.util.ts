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

type KnownPackages = {
  ws: typeof Ws;
  mqtt: typeof Mqtt;
  nats: typeof Nats;
  amqplib: typeof Amqplib;
  ioredis: typeof IORedis;
  kafkajs: typeof KafkaJs;
  '@grpc/grpc-js': typeof GrpcJs;
  '@fastify/view': typeof FastifyView;
  '@fastify/static': typeof FastifyStatic;
  'class-validator': typeof ClassValidator;
  'reflect-metadata': typeof ReflectMetadata;
  'class-transformer': typeof ClassTransformer;
  'amqp-connection-manager': typeof AmqplibConnManager;
};

export function loadPackage<T extends string>(
  packageName: T,
  context: string,
  loaderFn?: Function,
): T extends keyof KnownPackages ? KnownPackages[T] : any {
  try {
    return loaderFn ? loaderFn() : require(packageName);
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}
