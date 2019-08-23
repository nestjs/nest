import { expect } from 'chai';
import * as sinon from 'sinon';
import { KafkaLogger } from '../../helpers/kafka-logger';
import { logLevel } from '../../external/kafka.interface';

const namespace = 'namespace';
const label = 'label';
const entry = {
  message: 'message',
  other: {
    stuff: 'here'
  }
};

describe('kafka logger', () => {
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
      debug
    }, logLevel.DEBUG);
  });

  it('error', () => {
    kafkaLogger({
      namespace,
      level: logLevel.ERROR,
      label,
      log: entry
    });

    expect(error.calledOnce).to.be.true;
    expect(error.args[0][0]).to.eq('label [namespace] message {"other":{"stuff":"here"}}');
  });

  it('nothing', () => {
    kafkaLogger({
      namespace,
      level: logLevel.NOTHING,
      label,
      log: entry
    });

    expect(error.calledOnce).to.be.true;
  });

  it('warn', () => {
    kafkaLogger({
      namespace,
      level: logLevel.WARN,
      label,
      log: entry
    });

    expect(warn.calledOnce).to.be.true;
  });

  it('info', () => {
    kafkaLogger({
      namespace,
      level: logLevel.INFO,
      label,
      log: entry
    });

    expect(log.calledOnce).to.be.true;
  });

  it('debug', () => {
    kafkaLogger({
      namespace,
      level: logLevel.DEBUG,
      label,
      log: entry
    });

    expect(debug.calledOnce).to.be.true;
  });
});
