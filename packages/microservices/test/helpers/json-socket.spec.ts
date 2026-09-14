import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import { CorruptedPacketLengthException } from '../../errors/corrupted-packet-length.exception';
import { IncompleteMessageTimeoutException } from '../../errors/incomplete-message-timeout.exception';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception';
import { MaxSendBufferSizeExceededException } from '../../errors/max-send-buffer-size-exceeded.exception';
import { JsonSocket } from '../../helpers/json-socket';

function makeSocketStub(): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    write: sinon.stub(),
    end: sinon.stub(),
    pause: sinon.stub(),
    resume: sinon.stub(),
    destroy: sinon.stub(),
    writableLength: 0,
    connect: sinon.stub(),
  });
}

function frame(obj: unknown): string {
  const json = JSON.stringify(obj);
  return `${json.length}#${json}`;
}

describe('JsonSocket', () => {
  let socketStub: any;
  let jsonSocket: JsonSocket;
  let received: unknown[];

  beforeEach(() => {
    socketStub = makeSocketStub();
    jsonSocket = new JsonSocket(socketStub);
    received = [];
    socketStub.on('message', (msg: unknown) => received.push(msg));
  });

  describe('handleData – basic framing', () => {
    it('emits a single message from one complete chunk', () => {
      (jsonSocket as any).handleData(frame({ hello: 'world' }));

      expect(received).to.have.lengthOf(1);
      expect(received[0]).to.deep.equal({ hello: 'world' });
    });

    it('buffers a partial chunk and emits once complete', () => {
      const full = frame({ x: 1 });
      (jsonSocket as any).handleData(full.slice(0, 3));
      expect(received).to.have.lengthOf(0);

      (jsonSocket as any).handleData(full.slice(3));
      expect(received).to.have.lengthOf(1);
      expect(received[0]).to.deep.equal({ x: 1 });
    });

    it('emits multiple messages split across chunks', () => {
      const payload = frame({ a: 1 }) + frame({ b: 2 });
      const mid = Math.floor(payload.length / 2);
      (jsonSocket as any).handleData(payload.slice(0, mid));
      (jsonSocket as any).handleData(payload.slice(mid));

      expect(received).to.have.lengthOf(2);
      expect(received[0]).to.deep.equal({ a: 1 });
      expect(received[1]).to.deep.equal({ b: 2 });
    });
  });

  describe('handleData – pipelined messages (stack-overflow regression)', () => {
    it('processes many small pipelined frames without a stack overflow', () => {
      /**
       * A payload of `"2#{}" * 12_000` (~47 KB) used to trigger
       * "RangeError: Maximum call stack size exceeded" because each
       * framed message caused a recursive call back into handleData().
       *
       * The iterative while-loop fix must process all frames in O(1) stack depth.
       */
      const FRAME_COUNT = 12_000;
      const singleFrame = frame({}); // "2#{}"
      const bigPayload = singleFrame.repeat(FRAME_COUNT);

      expect(() => {
        (jsonSocket as any).handleData(bigPayload);
      }).not.to.throw();

      expect(received).to.have.lengthOf(FRAME_COUNT);
    });

    it('correctly identifies all message payloads in a pipelined burst', () => {
      const messages = Array.from({ length: 500 }, (_, i) => ({ id: i }));
      const payload = messages.map(frame).join('');

      (jsonSocket as any).handleData(payload);

      expect(received).to.have.lengthOf(messages.length);
      messages.forEach((msg, i) => {
        expect(received[i]).to.deep.equal(msg);
      });
    });
  });

  describe('handleData – error cases', () => {
    it('throws CorruptedPacketLengthException for a non-numeric length prefix', () => {
      expect(() => {
        (jsonSocket as any).handleData('abc#{}');
      }).to.throw(CorruptedPacketLengthException);
    });

    it('throws MaxPacketLengthExceededException when buffer exceeds maxBufferSize', () => {
      const tiny = new JsonSocket(socketStub, { maxBufferSize: 5 });
      expect(() => {
        (tiny as any).handleData('123456#');
      }).to.throw(MaxPacketLengthExceededException);
    });

    it('resets state after a corrupted length so subsequent valid frames are processed', () => {
      expect(() => (jsonSocket as any).handleData('bad#')).to.throw(
        CorruptedPacketLengthException,
      );
      // After the error the socket state must be clean
      (jsonSocket as any).handleData(frame({ ok: true }));
      expect(received).to.have.lengthOf(1);
      expect(received[0]).to.deep.equal({ ok: true });
    });
  });

  describe('incomplete message timeout', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });
    afterEach(() => {
      clock.restore();
    });

    it('drops a connection that goes silent in the middle of a packet', () => {
      const socket = makeSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      const socketUnderTest = new JsonSocket(socket, {
        incompleteMessageTimeout: 1000,
      });

      // A packet declaring far more data than is ever sent.
      (socketUnderTest as any).handleData('999999#partial');
      expect(socket.destroy.called).to.be.false;

      clock.tick(1000);

      expect(socket.destroy.called).to.be.true;
      expect(errors).to.have.lengthOf(1);
      expect(errors[0]).to.equal(
        new IncompleteMessageTimeoutException(7, 1000).message,
      );
    });

    it('does not interrupt a slow but progressing transfer', () => {
      const socket = makeSocketStub();
      const socketUnderTest = new JsonSocket(socket, {
        incompleteMessageTimeout: 1000,
      });

      (socketUnderTest as any).handleData('12#');
      for (let i = 0; i < 5; i++) {
        clock.tick(900);
        (socketUnderTest as any).handleData('ab');
      }

      // 4500ms elapsed against a 1000ms timeout, but the peer kept sending.
      expect(socket.destroy.called).to.be.false;
    });

    it('disarms the timer once the packet is complete', () => {
      const socket = makeSocketStub();
      const messages: unknown[] = [];
      socket.on('message', (msg: unknown) => messages.push(msg));
      const socketUnderTest = new JsonSocket(socket, {
        incompleteMessageTimeout: 1000,
      });

      (socketUnderTest as any).handleData(frame({ hello: 'world' }));
      clock.tick(10_000);

      expect(messages).to.have.lengthOf(1);
      expect(socket.destroy.called).to.be.false;
    });

    it('can be disabled with 0', () => {
      const socket = makeSocketStub();
      const socketUnderTest = new JsonSocket(socket, {
        incompleteMessageTimeout: 0,
      });

      (socketUnderTest as any).handleData('999999#partial');
      clock.tick(10_000);

      expect(socket.destroy.called).to.be.false;
    });
  });

  describe('write backpressure', () => {
    it('pauses reading when the outgoing buffer is above the high-water mark', () => {
      const socket = makeSocketStub();
      socket.write.returns(false);
      const socketUnderTest = new JsonSocket(socket);

      socketUnderTest.sendMessage({ some: 'payload' });

      expect(socket.pause.called).to.be.true;
    });

    it('does not pause reading while writes are flushed', () => {
      const socket = makeSocketStub();
      socket.write.returns(true);
      const socketUnderTest = new JsonSocket(socket);

      socketUnderTest.sendMessage({ some: 'payload' });

      expect(socket.pause.called).to.be.false;
    });

    it('resumes reading once the socket drains', () => {
      const socket = makeSocketStub();
      socket.write.returns(false);
      const socketUnderTest = new JsonSocket(socket);

      socketUnderTest.sendMessage({ some: 'payload' });
      socket.emit('drain');

      expect(socket.resume.called).to.be.true;
    });

    it('stops turning buffered frames into responses until the socket drains', () => {
      const socket = makeSocketStub();
      const messages: unknown[] = [];
      const socketUnderTest = new JsonSocket(socket);
      // Every inbound message triggers a response that does not flush.
      socket.write.returns(false);
      socket.on('message', (msg: unknown) => {
        messages.push(msg);
        socketUnderTest.sendMessage({ re: msg });
      });

      // Three pipelined requests arriving in a single read event.
      (socketUnderTest as any).handleData(
        frame({ n: 1 }) + frame({ n: 2 }) + frame({ n: 3 }),
      );

      expect(messages).to.have.lengthOf(1);
      expect(socket.pause.called).to.be.true;

      socket.write.returns(true);
      socket.emit('drain');

      expect(messages).to.have.lengthOf(3);
    });
  });

  describe('max send buffer size', () => {
    it('drops a peer that lets responses pile up beyond the limit', () => {
      const socket = makeSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      socket.write.callsFake(() => {
        socket.writableLength = 2048;
        return false;
      });
      const socketUnderTest = new JsonSocket(socket, {
        maxSendBufferSize: 1024,
      });

      socketUnderTest.sendMessage({ some: 'payload' });

      expect(socket.destroy.called).to.be.true;
      expect(errors).to.have.lengthOf(1);
      expect(errors[0]).to.equal(
        new MaxSendBufferSizeExceededException(2048, 1024).message,
      );
    });

    it('leaves a peer that stays within the limit alone', () => {
      const socket = makeSocketStub();
      socket.write.callsFake(() => {
        socket.writableLength = 512;
        return false;
      });
      const socketUnderTest = new JsonSocket(socket, {
        maxSendBufferSize: 1024,
      });

      socketUnderTest.sendMessage({ some: 'payload' });

      expect(socket.destroy.called).to.be.false;
      expect(socket.pause.called).to.be.true;
    });

    it('can be disabled with 0', () => {
      const socket = makeSocketStub();
      socket.write.callsFake(() => {
        socket.writableLength = 1024 * 1024 * 1024;
        return false;
      });
      const socketUnderTest = new JsonSocket(socket, { maxSendBufferSize: 0 });

      socketUnderTest.sendMessage({ some: 'payload' });

      expect(socket.destroy.called).to.be.false;
    });
  });
});
