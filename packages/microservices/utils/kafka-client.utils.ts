import {
  KAFKA_CORE_PACKAGE,
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from '../constants.js';
import {
  AssignerProtocol,
  BrokersFunction,
  ConfigDiagnostic,
  KafkaConfig,
  KafkaFileConfig,
} from '../external/kafka.interface.js';
import { KafkaLogger } from '../helpers/kafka-logger.js';
import {
  KafkaDriver,
  KafkaOptions,
} from '../interfaces/microservice-configuration.interface.js';
import { adaptKafkajsClient } from './kafkajs-adapter.utils.js';
import { LoggerService } from '@nestjs/common';
import { tryLoadPackage } from '@nestjs/common/internal';

/** The brokers and ids a Kafka server or client connects with. */
export interface KafkaClientIdentity {
  brokers: readonly string[] | BrokersFunction;
  clientId: string;
  groupId: string;
}

export interface CreateKafkaClientOptions {
  options: Required<KafkaOptions>['options'];
  /** The brokers and ids the transport set up in its constructor. */
  identity: KafkaClientIdentity;
  postfixId: string;
  logger: LoggerService;
  /** Loads a package, reporting it as missing when it cannot. */
  loadPackage: (name: string, loader: () => Promise<unknown>) => Promise<any>;
}

let hasWarnedOfKafkajs = false;

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
    brokers: options.client?.brokers || [KAFKA_DEFAULT_BROKER],
    clientId: (options.client?.clientId || KAFKA_DEFAULT_CLIENT) + postfixId,
    groupId: (options.consumer?.groupId || KAFKA_DEFAULT_GROUP) + postfixId,
  };
}

/**
 * Creates the client of a Kafka server or client, on kafka-core or, when the
 * `driver` option or the installed packages say so, on kafkajs, adapted to
 * the bigint offsets and timestamps of kafka-core.
 *
 * kafka-core discovers a `kafka.config.*` file when the options give no
 * brokers, or when `client.config` is `true` or a path. The file then fills in
 * the options left out, and replaces the brokers and ids the transport
 * defaulted. Ids that come from the options, or that a subclass set, are kept.
 * The ids of the file get the postfix of the transport too.
 *
 * @returns The client, the brokers and ids it connects with, and the
 * `AssignerProtocol` of the package it runs on.
 */
export async function createKafkaClient({
  options,
  identity,
  postfixId,
  logger,
  loadPackage,
}: CreateKafkaClientOptions): Promise<{
  client: unknown;
  identity: KafkaClientIdentity;
  assignerProtocol: typeof AssignerProtocol;
}> {
  const { driver, kafkaPackage } = await loadKafkaPackage(
    options.driver,
    loadPackage,
    logger,
  );
  const logCreator = KafkaLogger.bind(null, logger);
  if (driver === 'kafkajs') {
    const { config, ...clientOptions } = options.client ?? {};
    if (config) {
      throw new Error(
        `The "client.config" option needs the "${KAFKA_CORE_PACKAGE}" package: kafkajs does not read kafka.config files.`,
      );
    }
    const kafka = new kafkaPackage.Kafka({
      logCreator,
      ...clientOptions,
      brokers: identity.brokers,
      clientId: identity.clientId,
    });
    return {
      client: adaptKafkajsClient(kafka),
      identity,
      assignerProtocol: kafkaPackage.AssignerProtocol,
    };
  }

  const { config, fileConfig } = await resolveKafkaConfig(
    kafkaPackage,
    options.client ?? {},
    logger,
  );
  const defaults = getKafkaIdentity({}, postfixId);
  const resolvedIdentity: KafkaClientIdentity = {
    brokers: isDefaultBrokers(identity.brokers)
      ? config.brokers!
      : identity.brokers,
    clientId:
      identity.clientId === defaults.clientId
        ? (config.clientId || KAFKA_DEFAULT_CLIENT) + postfixId
        : identity.clientId,
    groupId:
      identity.groupId === defaults.groupId
        ? (fileConfig.consumer?.groupId || KAFKA_DEFAULT_GROUP) + postfixId
        : identity.groupId,
  };
  const client = kafkaPackage.Kafka.from(fileConfig, {
    logCreator,
    ...config,
    brokers: resolvedIdentity.brokers,
    clientId: resolvedIdentity.clientId,
  });
  return {
    client,
    identity: resolvedIdentity,
    assignerProtocol: kafkaPackage.AssignerProtocol,
  };
}

const importKafkaCore = () => import('@cookiemonsterdev/kafka-core');
const importKafkajs = () => import('kafkajs');

/**
 * Loads the package the `driver` option names. Without one, kafka-core when
 * it is installed and loads (it needs Node.js 24), otherwise kafkajs.
 */
async function loadKafkaPackage(
  driver: KafkaDriver | undefined,
  loadPackage: CreateKafkaClientOptions['loadPackage'],
  logger: LoggerService,
): Promise<{ driver: KafkaDriver; kafkaPackage: any }> {
  if (driver === 'kafkajs') {
    return {
      driver,
      kafkaPackage: await loadPackage('kafkajs', importKafkajs),
    };
  }
  if (!driver) {
    const kafkaCore = await tryLoadPackage(KAFKA_CORE_PACKAGE, importKafkaCore);
    if (kafkaCore) {
      return { driver: 'kafka-core', kafkaPackage: kafkaCore };
    }
    const kafkajs = await tryLoadPackage('kafkajs', importKafkajs);
    if (kafkajs) {
      warnOfKafkajs(logger);
      return { driver: 'kafkajs', kafkaPackage: kafkajs };
    }
  }
  if (Number(process.versions.node.split('.')[0]) < 24) {
    logger.error(
      `"${KAFKA_CORE_PACKAGE}" needs Node.js 24 or newer. Upgrade Node.js, or install kafkajs.`,
    );
  }
  // Also reports kafka-core as the package to install when neither loads
  return {
    driver: 'kafka-core',
    kafkaPackage: await loadPackage(KAFKA_CORE_PACKAGE, importKafkaCore),
  };
}

function warnOfKafkajs(logger: LoggerService) {
  if (hasWarnedOfKafkajs) {
    return;
  }
  hasWarnedOfKafkajs = true;
  logger.warn(
    `Running on kafkajs, whose support is deprecated and will be removed in the next major version. Switch to "${KAFKA_CORE_PACKAGE}", which needs Node.js 24 or newer.`,
  );
}

/**
 * Merges the client options with a config file. Without brokers in either,
 * the transport connects to the default broker, as it always has.
 */
async function resolveKafkaConfig(
  kafkaPackage: any,
  clientOptions: KafkaConfig,
  logger: LoggerService,
): Promise<{ config: KafkaConfig; fileConfig: KafkaFileConfig }> {
  const onDiagnostic = ({ level, message }: ConfigDiagnostic) =>
    level === 'warn' ? logger.warn(message) : logger.log(message);
  try {
    const { config, fileConfig } = await kafkaPackage.resolveKafkaConfigAsync(
      clientOptions,
      { onDiagnostic },
    );
    return { config, fileConfig: fileConfig ?? {} };
  } catch (err) {
    // A config file without brokers is an error kafka-core explains
    if (
      err?.name !== 'KafkaConfigError' ||
      err.tag !== 'MissingBrokers' ||
      err.path
    ) {
      throw err;
    }
    return {
      config: { ...clientOptions, brokers: [KAFKA_DEFAULT_BROKER] },
      fileConfig: {},
    };
  }
}

function isDefaultBrokers(brokers: KafkaClientIdentity['brokers']) {
  return (
    Array.isArray(brokers) &&
    brokers.length === 1 &&
    brokers[0] === KAFKA_DEFAULT_BROKER
  );
}
