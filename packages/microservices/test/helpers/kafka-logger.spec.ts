import { inspect } from 'util';
import { logLevel } from '../../external/kafka.interface.js';
import { KafkaLogger } from '../../helpers/kafka-logger.js';

const namespace = 'namespace';
const label = 'label';
const entry = {
  message: 'message',
  other: {
    stuff: 'here',
  },
};

describe('KafkaLogger', () => {
  let kafkaLogger: any;

  let error: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.fn>;
  let log: ReturnType<typeof vi.fn>;
  let debug: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // set
    error = vi.fn();
    warn = vi.fn();
    log = vi.fn();
    debug = vi.fn();

    kafkaLogger = KafkaLogger({
      error,
      warn,
      log,
      debug,
    });
  });

  it('error', () => {
    kafkaLogger({
      namespace,
      level: logLevel.ERROR,
      label,
      log: entry,
    });

    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0]).toBe(
      'label [namespace] message {"other":{"stuff":"here"}}',
    );
  });

  it('nothing', () => {
    kafkaLogger({
      namespace,
      level: logLevel.NOTHING,
      label,
      log: entry,
    });

    expect(error).toHaveBeenCalledOnce();
  });

  it('warn', () => {
    kafkaLogger({
      namespace,
      level: logLevel.WARN,
      label,
      log: entry,
    });

    expect(warn).toHaveBeenCalledOnce();
  });

  it('info', () => {
    kafkaLogger({
      namespace,
      level: logLevel.INFO,
      label,
      log: entry,
    });

    expect(log).toHaveBeenCalledOnce();
  });

  it('debug', () => {
    kafkaLogger({
      namespace,
      level: logLevel.DEBUG,
      label,
      log: entry,
    });

    expect(debug).toHaveBeenCalledOnce();
  });

  it('should log the entry as json', () => {
    kafkaLogger({ namespace, level: logLevel.ERROR, label, log: entry });

    expect(error).toHaveBeenCalledExactlyOnceWith(
      'label [namespace] message {"other":{"stuff":"here"}}',
    );
  });

  describe('when the entry cannot be serialized as json', () => {
    // kafkajs logs the error an "eachMessage" handler rejected with this way
    const logError = (rejection: unknown) =>
      kafkaLogger({
        namespace,
        level: logLevel.ERROR,
        label,
        log: { message: 'message', topic: 'topic', error: rejection },
      });

    it('should log an entry with a circular reference', () => {
      const circular: Record<string, unknown> = { name: 'circular' };
      circular.self = circular;

      expect(() => logError(circular)).not.toThrow();
      expect(error).toHaveBeenCalledExactlyOnceWith(
        "label [namespace] message { topic: 'topic', error: <ref *1> { name: 'circular', self: [Circular *1] } }",
      );
    });

    it('should log an entry with a BigInt value', () => {
      expect(() => logError({ limit: 10n })).not.toThrow();
      expect(error).toHaveBeenCalledExactlyOnceWith(
        "label [namespace] message { topic: 'topic', error: { limit: 10n } }",
      );
    });

    it('should log an entry nested deeper than JSON.stringify can recurse', () => {
      // JSON.parse accepts any depth, so a Kafka record can carry such a value
      let nested: Record<string, unknown> = {};
      for (let i = 0; i < 100_000; i++) {
        nested = { a: nested };
      }

      expect(() => logError(nested)).not.toThrow();
      expect(error).toHaveBeenCalledExactlyOnceWith(
        "label [namespace] message { topic: 'topic', error: { a: { a: [Object] } } }",
      );
    });

    it('should log an entry that cannot be inspected either', () => {
      const unreadable = {
        toJSON: () => {
          throw new Error('unreadable');
        },
        [inspect.custom]: () => {
          throw new Error('unreadable');
        },
      };

      expect(() => logError(unreadable)).not.toThrow();
      expect(error).toHaveBeenCalledExactlyOnceWith(
        'label [namespace] message [unserializable log entry]',
      );
    });
  });
});
