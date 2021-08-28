import * as sinon from 'sinon';
import { logLevel } from '../../external/kafka.interface';
import { KafkaLogger } from '../../helpers/kafka-logger';

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

  let error: sinon.SinonSpy;
  let warn: sinon.SinonSpy;
  let log: sinon.SinonSpy;
  let debug: sinon.SinonSpy;

  beforeEach(() => {
    // set
    error = sinon.spy();
    warn = sinon.spy();
    log = sinon.spy();
    debug = sinon.spy();

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

    expect(error.calledOnce).toBeTruthy();
    expect(error.args[0][0]).toEqual(
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

    expect(error.calledOnce).toBeTruthy();
  });

  it('warn', () => {
    kafkaLogger({
      namespace,
      level: logLevel.WARN,
      label,
      log: entry,
    });

    expect(warn.calledOnce).toBeTruthy();
  });

  it('info', () => {
    kafkaLogger({
      namespace,
      level: logLevel.INFO,
      label,
      log: entry,
    });

    expect(log.calledOnce).toBeTruthy();
  });

  it('debug', () => {
    kafkaLogger({
      namespace,
      level: logLevel.DEBUG,
      label,
      log: entry,
    });

    expect(debug.calledOnce).toBeTruthy();
  });
});
