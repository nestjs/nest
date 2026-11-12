import { expect } from 'chai';
import * as sinon from 'sinon';
import { inspect } from 'util';
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

    expect(error.calledOnce).to.be.true;
    expect(error.args[0][0]).to.eq(
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

    expect(error.calledOnce).to.be.true;
  });

  it('warn', () => {
    kafkaLogger({
      namespace,
      level: logLevel.WARN,
      label,
      log: entry,
    });

    expect(warn.calledOnce).to.be.true;
  });

  it('info', () => {
    kafkaLogger({
      namespace,
      level: logLevel.INFO,
      label,
      log: entry,
    });

    expect(log.calledOnce).to.be.true;
  });

  it('debug', () => {
    kafkaLogger({
      namespace,
      level: logLevel.DEBUG,
      label,
      log: entry,
    });

    expect(debug.calledOnce).to.be.true;
  });

  it('should log the entry as json', () => {
    kafkaLogger({ namespace, level: logLevel.ERROR, label, log: entry });

    expect(error.calledOnce).to.be.true;
    expect(error.firstCall.args).to.deep.equal([
      'label [namespace] message {"other":{"stuff":"here"}}',
    ]);
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
    const expectLoggedOnce = (line: string) => {
      expect(error.calledOnce).to.be.true;
      expect(error.firstCall.args).to.deep.equal([line]);
    };

    it('should log an entry with a circular reference', () => {
      const circular: Record<string, unknown> = { name: 'circular' };
      circular.self = circular;

      expect(() => logError(circular)).to.not.throw();
      expectLoggedOnce(
        "label [namespace] message { topic: 'topic', error: <ref *1> { name: 'circular', self: [Circular *1] } }",
      );
    });

    it('should log an entry with a BigInt value', () => {
      expect(() => logError({ limit: BigInt(10) })).to.not.throw();
      expectLoggedOnce(
        "label [namespace] message { topic: 'topic', error: { limit: 10n } }",
      );
    });

    it('should log an entry nested deeper than JSON.stringify can recurse', () => {
      // JSON.parse accepts any depth, so a Kafka record can carry such a value
      let nested: Record<string, unknown> = {};
      for (let i = 0; i < 100_000; i++) {
        nested = { a: nested };
      }

      expect(() => logError(nested)).to.not.throw();
      expectLoggedOnce(
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

      expect(() => logError(unreadable)).to.not.throw();
      expectLoggedOnce('label [namespace] message [unserializable log entry]');
    });
  });
});
