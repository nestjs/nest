import { LoggerService, LogLevel } from '../services/logger.service';

/**
 * @publicApi
 */
export class NestApplicationContextOptions {
  /**
   * Specifies the logger to use.  Pass `false` to turn off logging.
   */
  logger?: LoggerService | LogLevel[] | false;

  /**
   * Whether to abort the process on Error. By default, the process is exited.
   * Pass `false` to override the default behavior. If `false` is passed, Nest will not exit
   * the application and instead will rethrow the exception.
   * @default true
   */
  abortOnError?: boolean | undefined;

  /**
   * If enabled, logs will be buffered until the "Logger#flush" method is called.
   * @default false
   */
  bufferLogs?: boolean;

  /**
   * If enabled, logs will be automatically flushed and buffer detached when
   * application initialization process either completes or fails.
   * @default true
   */
  autoFlushLogs?: boolean;

  /**
   * Whether to run application in the preview mode.
   * In the preview mode, providers/controllers are not instantiated & resolved.
   *
   * @default false
   */
  preview?: boolean;

  /**
   * Whether to generate a serialized graph snapshot.
   *
   * @default false
   */
  snapshot?: boolean;

  /**
   * Determines what algorithm use to generate module ids.
   * When set to `deep-hash`, the module id is generated based on the serialized module definition.
   * When set to `reference`, each module obtains a unique id based on its reference.
   *
   * @default 'reference'
   */
  moduleIdGeneratorAlgorithm?: 'deep-hash' | 'reference';

  /**
   * Instrument the application context.
   * This option allows you to add custom instrumentation to the application context.
   */
  instrument?: {
    /**
     * Function that decorates each instance created by the application context.
     * This function can be used to add custom properties or methods to the instance.
     * @param instance The instance to decorate.
     * @returns The decorated instance.
     */
    instanceDecorator: (instance: unknown) => unknown;
  };

  /**
   * If enabled, will force the use of console.log/console.error instead of process.stdout/stderr.write
   * in the default ConsoleLogger. This is useful for test environments like Jest that can buffer console calls.
   * @default false
   */
  forceConsole?: boolean;
}
