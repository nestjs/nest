import { Logger } from '../services/logger.service';

const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`;

const logger = new Logger('PackageLoader');

type KnownPackages = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  ws: typeof import('ws');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  mqtt: typeof import('mqtt');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  nats: typeof import('nats');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  amqplib: typeof import('amqplib');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  ioredis: typeof import('ioredis');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  kafkajs: typeof import('kafkajs');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  '@grpc/grpc-js': typeof import('@grpc/grpc-js');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  '@fastify/view': typeof import('@fastify/view');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  '@fastify/static': typeof import('@fastify/static');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  'class-validator': typeof import('class-validator');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  'reflect-metadata': typeof import('reflect-metadata');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  'class-transformer': typeof import('class-transformer');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /** @ts-ignore:next-line */
  'amqp-connection-manager': typeof import('amqp-connection-manager');
};

export function loadPackage<T extends keyof KnownPackages>(
  packageName: T,
  context: string,
  loaderFn?: Function,
): KnownPackages[T];
export function loadPackage(
  packageName: string,
  context: string,
  loaderFn?: Function,
): any;
export function loadPackage(
  packageName: string,
  context: string,
  loaderFn?: Function,
): any {
  try {
    return loaderFn ? loaderFn() : require(packageName);
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}
