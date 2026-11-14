import { inspect } from 'util';
import { logLevel } from '../external/kafka.interface.js';

/**
 * Serializes the details of a log entry. JSON.stringify() throws on circular
 * references, on BigInt values and on values nested deeper than it can
 * recurse, so such an entry is formatted with inspect() instead. kafkajs logs
 * from inside its own error handling (such as the error an `eachMessage`
 * handler rejected with), where an exception thrown by the logger would take
 * the place of the error being handled and stop the consumer for good.
 */
const stringifyLogEntry = (entry: Record<string, unknown>): string => {
  try {
    return JSON.stringify(entry);
  } catch {
    try {
      return inspect(entry, { compact: true, breakLength: Infinity });
    } catch {
      return '[unserializable log entry]';
    }
  }
};

export const KafkaLogger =
  (logger: any) =>
  ({ namespace, level, label, log }) => {
    let loggerMethod: string;

    switch (level) {
      case logLevel.ERROR:
      case logLevel.NOTHING:
        loggerMethod = 'error';
        break;
      case logLevel.WARN:
        loggerMethod = 'warn';
        break;
      case logLevel.INFO:
        loggerMethod = 'log';
        break;
      case logLevel.DEBUG:
      default:
        loggerMethod = 'debug';
        break;
    }

    const { message, ...others } = log;
    // kafka-core logs some entries, such as the partitioner warning, from its
    // root logger, which has no namespace
    const scope = namespace ? ` [${namespace}]` : '';
    if (logger[loggerMethod]) {
      logger[loggerMethod](
        `${label}${scope} ${message} ${stringifyLogEntry(others)}`,
      );
    }
  };
