import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from '../constants.js';
import { BrokersFunction, KafkaConfig } from '../external/kafka.interface.js';
import type * as Platformatic from '../external/platformatic-kafka.interface.js';
import { KafkaLogger } from '../helpers/kafka-logger.js';
import { PlatformaticKafkaClient } from '../helpers/platformatic-kafka-client.js';
import { KafkaDriver } from '../interfaces/kafka-driver-types.interface.js';
import {
  KafkaOptions,
  PlatformaticKafkaTransportOptions,
} from '../interfaces/microservice-configuration.interface.js';
import { LoggerService } from '@nestjs/common';

/** The brokers and ids a Kafka server or client connects with. */
export interface KafkaClientIdentity {
  brokers: string[] | BrokersFunction;
  clientId: string;
  groupId: string;
}

export interface CreateKafkaClientOptions {
  /**
   * The options of the transport, typed as those of kafkajs. On
   * `@platformatic/kafka`, they hold the options of `@platformatic/kafka`.
   */
  options: Required<KafkaOptions>['options'];
  /** The brokers the transport set up in its constructor (or a subclass). */
  brokers: string[] | BrokersFunction;
  clientId: string;
  logger: LoggerService;
  /** Loads a package, reporting it as missing when it cannot. */
  loadPackage: (name: string, loader: () => Promise<unknown>) => Promise<any>;
}

/**
 * The brokers and ids a Kafka server or client takes from its options, with
 * the defaults for what they leave out. The ids get the postfix of the
 * transport.
 */
export function getKafkaIdentity(
  options: Required<KafkaOptions>['options'],
  postfixId: string,
): KafkaClientIdentity {
  return {
    brokers: getBrokers(options) || [KAFKA_DEFAULT_BROKER],
    clientId: (options.client?.clientId || KAFKA_DEFAULT_CLIENT) + postfixId,
    groupId: (options.consumer?.groupId || KAFKA_DEFAULT_GROUP) + postfixId,
  };
}

function getBrokers(options: Required<KafkaOptions>['options']) {
  const platformaticOptions = asPlatformaticOptions(options);
  if (platformaticOptions) {
    // Brokers given as `{ host, port }` objects are passed on as they are
    return platformaticOptions.client?.bootstrapBrokers as string[] | undefined;
  }
  return options.client?.brokers;
}

/**
 * Creates the client of a Kafka server or client: kafkajs, or
 * `@platformatic/kafka` when the `driver` option says so. On
 * `@platformatic/kafka`, it is a `PlatformaticKafkaClient`, which creates
 * consumers and producers as kafkajs does.
 */
export async function createKafkaClient({
  options,
  brokers,
  clientId,
  logger,
  loadPackage,
}: CreateKafkaClientOptions): Promise<unknown> {
  const platformaticOptions = asPlatformaticOptions(options);
  if (platformaticOptions) {
    // Only a subclass can set brokers that `bootstrapBrokers` cannot take
    if (typeof brokers === 'function') {
      throw new Error(
        '@platformatic/kafka takes a list of brokers, not a function',
      );
    }
    const kafkaPackage = await loadPackage(
      '@platformatic/kafka',
      () => import('@platformatic/kafka'),
    );
    const clientOptions: Platformatic.BaseOptions = {
      ...platformaticOptions.client,
      bootstrapBrokers: brokers,
      clientId,
    };
    return new PlatformaticKafkaClient(kafkaPackage, clientOptions, logger);
  }

  const kafkaPackage = await loadPackage('kafkajs', () => import('kafkajs'));
  return new kafkaPackage.Kafka({
    logCreator: KafkaLogger.bind(null, logger),
    ...options.client,
    brokers,
    clientId,
  } as KafkaConfig);
}

/**
 * The options of a transport that runs on `@platformatic/kafka`, which are
 * typed as those of kafkajs (see `CreateKafkaClientOptions`).
 */
function asPlatformaticOptions(
  options: Required<KafkaOptions>['options'],
): PlatformaticKafkaTransportOptions | undefined {
  return (options.driver as KafkaDriver) === 'platformatic'
    ? (options as unknown as PlatformaticKafkaTransportOptions)
    : undefined;
}
