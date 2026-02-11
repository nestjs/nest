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
    expect(error.mock.calls[0][0]).to.eq(
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
});
