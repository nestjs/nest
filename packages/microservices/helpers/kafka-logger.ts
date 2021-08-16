import { logLevel } from '../external/kafka.interface';

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
    if (logger[loggerMethod]) {
      logger[loggerMethod](
        `${label} [${namespace}] ${message} ${JSON.stringify(others)}`,
      );
    }
  };
