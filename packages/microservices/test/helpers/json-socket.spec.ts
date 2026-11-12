import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import { CorruptedPacketLengthException } from '../../errors/corrupted-packet-length.exception';
import { DrainTimeoutException } from '../../errors/drain-timeout.exception';
import { IncompleteMessageTimeoutException } from '../../errors/incomplete-message-timeout.exception';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception';
import { MaxSendBufferSizeExceededException } from '../../errors/max-send-buffer-size-exceeded.exception';
import { PendingMessagesTimeoutException } from '../../errors/pending-messages-timeout.exception';
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

  describe('handleData – packets arriving in many small reads', () => {
    let bufferFrom: sinon.SinonSpy;
    const countFlattenings = () =>
      bufferFrom
        .getCalls()
        .filter(({ args: [, encoding] }) => encoding === 'utf16le').length;

    beforeEach(() => {
      jsonSocket = new JsonSocket(socketStub, {
        incompleteMessageTimeout: 0,
      });
      bufferFrom = sinon.spy(Buffer, 'from');
    });
    afterEach(() => {
      bufferFrom.restore();
    });

    it('flattens the buffer of a packet that arrives a character per read', () => {
      // Each appended read would otherwise stay a piece of its own until the
      // packet is complete
      const body = JSON.stringify('x'.repeat(5000));
      (jsonSocket as any).handleData(`${body.length}#`);
      for (const character of body) {
        (jsonSocket as any).handleData(character);
      }

      expect(countFlattenings()).to.be.greaterThan(0);
      expect(countFlattenings()).to.be.lessThan(10);
      expect(received).to.deep.equal(['x'.repeat(5000)]);
    });

    it('does not flatten the buffer for reads of an ordinary size', () => {
      const body = JSON.stringify('x'.repeat(2048 * 1024));
      (jsonSocket as any).handleData(`${body.length}#`);
      for (let i = 0; i < body.length; i += 1024) {
        (jsonSocket as any).handleData(body.substring(i, i + 1024));
      }

      expect(countFlattenings()).to.equal(0);
      expect(received).to.deep.equal(['x'.repeat(2048 * 1024)]);
    });

    it('keeps a surrogate pair that is split across reads intact', () => {
      const text = 'a'.repeat(1021) + '😀';
      const body = JSON.stringify(text);
      (jsonSocket as any).handleData(`${body.length}#`);
      for (const character of body.substring(0, 1022)) {
        (jsonSocket as any).handleData(character);
      }
      expect(countFlattenings()).to.equal(0);
      // The 1024th read ends between the halves of the pair, and the buffer
      // is flattened right after it
      (jsonSocket as any).handleData('\uD83D');
      expect(countFlattenings()).to.equal(1);
      (jsonSocket as any).handleData('\uDE00"');

      expect(received).to.deep.equal([text]);
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

    it('does not keep data without a delimiter beyond the size of a content length', () => {
      // Every read scans the buffered data for the delimiter, so data that
      // never contains one must not pile up and be scanned again and again.
      const bufferLengths: number[] = [];
      const errors: unknown[] = [];
      for (let i = 0; i < 100; i++) {
        try {
          (jsonSocket as any).handleData('1');
        } catch (err) {
          errors.push(err);
        }
        bufferLengths.push((jsonSocket as any).buffer.length);
      }

      expect(Math.max(...bufferLengths)).to.equal(32);
      expect(bufferLengths[32]).to.equal(0);
      // Nothing is read after the error
      expect(bufferLengths.slice(32).every(length => length === 0)).to.be.true;
      expect(errors).to.have.lengthOf(1);
      expect(errors[0]).to.be.instanceOf(CorruptedPacketLengthException);
    });

    it('accepts a content length that is split across reads', () => {
      (jsonSocket as any).handleData('1');
      (jsonSocket as any).handleData('0#{"x":1234}');

      expect(received).to.deep.equal([{ x: 1234 }]);
    });

    it('ignores what the peer sends after a corrupted length', () => {
      expect(() => (jsonSocket as any).handleData('bad#')).to.throw(
        CorruptedPacketLengthException,
      );
      // The connection is being closed, and where the next packet starts can
      // no longer be told
      (jsonSocket as any).handleData(frame({ ok: true }));
      expect(received).to.have.lengthOf(0);
      expect((jsonSocket as any).buffer).to.equal('');
      expect((jsonSocket as any).contentLength).to.be.null;
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

    it('keeps reading when "pauseOnBackpressure" is false', () => {
      const socket = makeSocketStub();
      const received: unknown[] = [];
      const jsonSocket = new JsonSocket(socket, { pauseOnBackpressure: false });
      socket.write.returns(false);
      socket.on('message', (msg: unknown) => {
        received.push(msg);
        jsonSocket.sendMessage({ re: msg });
      });

      (jsonSocket as any).handleData(
        frame({ n: 1 }) + frame({ n: 2 }) + frame({ n: 3 }),
      );

      expect(received).to.have.lengthOf(3);
      expect(socket.pause.called).to.be.false;
    });
  });

  describe('pauseMessages', () => {
    it('emits no further frame of a read until messages are resumed', () => {
      socketStub.on('message', () => {
        if (received.length === 2) {
          jsonSocket.pauseMessages();
        }
      });

      (jsonSocket as any).handleData(
        frame({ n: 1 }) + frame({ n: 2 }) + frame({ n: 3 }) + frame({ n: 4 }),
      );
      expect(received).to.deep.equal([{ n: 1 }, { n: 2 }]);

      jsonSocket.resumeMessages();
      expect(received).to.deep.equal([{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }]);
    });

    it('keeps reading until more than maxBufferSize characters wait', () => {
      const socket = makeSocketStub();
      const jsonSocket = new JsonSocket(socket, { maxBufferSize: 100 });
      const messages: unknown[] = [];
      socket.on('message', (msg: unknown) => messages.push(msg));
      const packet = frame({ text: 'x'.repeat(30) }); // 46 characters

      jsonSocket.pauseMessages();
      (jsonSocket as any).handleData(packet + packet);
      // A peer that leaves is still noticed
      expect(socket.pause.called).to.be.false;

      (jsonSocket as any).handleData(packet);
      expect(socket.pause.calledOnce).to.be.true;
      expect(messages).to.deep.equal([]);

      jsonSocket.resumeMessages();
      expect(socket.resume.calledOnce).to.be.true;
      expect(messages).to.have.lengthOf(3);
    });

    it('does not time out complete frames that wait to be emitted', () => {
      const clock = sinon.useFakeTimers();
      try {
        const socket = makeSocketStub();
        const jsonSocket = new JsonSocket(socket);
        jsonSocket.pauseMessages();
        socket.emit('data', Buffer.from(frame({ n: 1 })));

        // The peer waits for its replies meanwhile
        clock.tick(600_000);
        expect(socket.destroy.called).to.be.false;
      } finally {
        clock.restore();
      }
    });

    it('does not count the time messages are paused against the peer', () => {
      const clock = sinon.useFakeTimers();
      try {
        const socket = makeSocketStub();
        const jsonSocket = new JsonSocket(socket, {
          incompleteMessageTimeout: 1000,
        });
        socket.emit('data', Buffer.from('100#partial'));
        clock.tick(500);

        jsonSocket.pauseMessages();
        clock.tick(10_000);
        expect(socket.destroy.called).to.be.false;

        jsonSocket.resumeMessages();
        clock.tick(999);
        expect(socket.destroy.called).to.be.false;
        clock.tick(1);
        expect(socket.destroy.calledOnce).to.be.true;
      } finally {
        clock.restore();
      }
    });

    describe('while reading is suspended', () => {
      const packet = frame({ text: 'x'.repeat(100) });
      let clock: sinon.SinonFakeTimers;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
      });
      afterEach(() => {
        clock.restore();
      });

      it('drops a peer none of whose messages settles for drainTimeout', () => {
        const socket = makeSocketStub();
        const errors: string[] = [];
        socket.on('error', (message: string) => errors.push(message));
        const jsonSocket = new JsonSocket(socket, {
          maxBufferSize: 100,
          drainTimeout: 1000,
        });
        jsonSocket.pauseMessages();
        (jsonSocket as any).handleData(packet);
        expect(socket.pause.calledOnce).to.be.true;

        // With reading suspended, a peer that left would not be noticed
        clock.tick(999);
        expect(socket.destroy.called).to.be.false;
        clock.tick(1);

        expect(socket.destroy.calledOnce).to.be.true;
        expect(errors).to.deep.equal([
          new PendingMessagesTimeoutException(packet.length, 1000).message,
        ]);
      });

      it('keeps a peer whose messages are resumed in time', () => {
        const socket = makeSocketStub();
        const jsonSocket = new JsonSocket(socket, {
          maxBufferSize: 100,
          drainTimeout: 1000,
        });
        jsonSocket.pauseMessages();
        (jsonSocket as any).handleData(packet);
        clock.tick(500);
        jsonSocket.resumeMessages();

        clock.tick(10_000);
        expect(socket.destroy.called).to.be.false;
      });

      it('keeps the peer when drainTimeout is 0', () => {
        const socket = makeSocketStub();
        const jsonSocket = new JsonSocket(socket, {
          maxBufferSize: 100,
          drainTimeout: 0,
        });
        jsonSocket.pauseMessages();
        (jsonSocket as any).handleData(packet);

        clock.tick(600_000);
        expect(socket.destroy.called).to.be.false;
      });
    });

    it('drops the frames waiting once the connection is torn down', () => {
      jsonSocket.pauseMessages();
      (jsonSocket as any).handleData(frame({ n: 1 }));
      socketStub.destroyed = true;

      jsonSocket.resumeMessages();
      expect(received).to.deep.equal([]);
    });

    it('still emits the frames of a peer that ended the connection after them', () => {
      jsonSocket.pauseMessages();
      (jsonSocket as any).handleData(frame({ n: 1 }) + frame({ n: 2 }));
      socketStub.readableEnded = true;
      socketStub.destroyed = true;
      socketStub.emit('close');

      jsonSocket.resumeMessages();
      expect(received).to.deep.equal([{ n: 1 }, { n: 2 }]);
    });

    it('emits nothing while the outgoing buffer is still backed up', () => {
      (jsonSocket as any).handleData(frame({ n: 1 }));
      jsonSocket.pauseMessages();
      (jsonSocket as any).handleData(frame({ n: 2 }));
      socketStub.write.returns(false);
      jsonSocket.sendMessage({ some: 'payload' });
      expect(socketStub.pause.calledOnce).to.be.true;

      jsonSocket.resumeMessages();
      expect(socketStub.resume.called).to.be.false;
      expect(received).to.deep.equal([{ n: 1 }]);

      socketStub.emit('drain');
      expect(socketStub.resume.calledOnce).to.be.true;
      expect(received).to.deep.equal([{ n: 1 }, { n: 2 }]);
    });

    it('emits nothing after a drain while messages are paused', () => {
      socketStub.write.returns(false);
      jsonSocket.sendMessage({ some: 'payload' });
      jsonSocket.pauseMessages();
      socketStub.emit('drain');
      // Reading goes on while fewer than maxBufferSize characters wait
      expect(socketStub.resume.calledOnce).to.be.true;

      (jsonSocket as any).handleData(frame({ n: 1 }));
      expect(received).to.deep.equal([]);

      jsonSocket.resumeMessages();
      expect(received).to.deep.equal([{ n: 1 }]);
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

  describe('drain timeout', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });
    afterEach(() => {
      clock.restore();
    });

    // Every write stays queued until a test lets some of it be written out.
    function makeUnreadSocketStub() {
      const socket = makeSocketStub();
      socket.write.callsFake((data: string) => {
        socket.writableLength += data.length;
        return false;
      });
      return socket;
    }

    it('drops a peer that reads none of its responses', () => {
      const socket = makeUnreadSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      const jsonSocket = new JsonSocket(socket, { drainTimeout: 1000 });

      jsonSocket.sendMessage({ some: 'payload' });
      clock.tick(999);
      expect(socket.destroy.called).to.be.false;

      clock.tick(1);

      expect(socket.destroy.calledOnce).to.be.true;
      expect(errors).to.deep.equal([
        new DrainTimeoutException(frame({ some: 'payload' }).length, 1000)
          .message,
      ]);
    });

    it('is enabled by default, with 30 seconds', () => {
      const socket = makeUnreadSocketStub();
      socket.on('error', () => {});
      const jsonSocket = new JsonSocket(socket);

      jsonSocket.sendMessage({ some: 'payload' });
      clock.tick(29_999);
      expect(socket.destroy.called).to.be.false;

      clock.tick(1);
      expect(socket.destroy.calledOnce).to.be.true;
    });

    it('gives a peer that keeps reading, however slowly, more time', () => {
      const socket = makeUnreadSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      const jsonSocket = new JsonSocket(socket, { drainTimeout: 1000 });
      const response = { some: 'payload' };

      for (let i = 0; i < 5; i++) {
        jsonSocket.sendMessage(response);
      }
      for (let i = 0; i < 4; i++) {
        // One more response is written out to the peer in every period
        socket.writableLength -= frame(response).length;
        clock.tick(1000);
      }

      // 4000ms elapsed against a 1000ms timeout, but the peer kept reading.
      expect(socket.destroy.called).to.be.false;

      clock.tick(1000);
      expect(socket.destroy.calledOnce).to.be.true;
      expect(errors).to.have.lengthOf(1);
    });

    it('only counts what is written out, not responses queued meanwhile', () => {
      const socket = makeUnreadSocketStub();
      socket.on('error', () => {});
      const jsonSocket = new JsonSocket(socket, { drainTimeout: 1000 });

      jsonSocket.sendMessage({ n: 1 });
      // The first response is written out, but a larger one queues up behind
      socket.writableLength -= frame({ n: 1 }).length;
      jsonSocket.sendMessage({ n: 2, padding: 'x'.repeat(100) });
      clock.tick(1000);
      expect(socket.destroy.called).to.be.false;

      // More responses queue up, but none is written out
      jsonSocket.sendMessage({ n: 3 });
      clock.tick(1000);
      expect(socket.destroy.calledOnce).to.be.true;
    });

    it('disarms the timer once the socket drains', () => {
      const socket = makeUnreadSocketStub();
      const jsonSocket = new JsonSocket(socket, { drainTimeout: 1000 });

      jsonSocket.sendMessage({ some: 'payload' });
      socket.writableLength = 0;
      socket.emit('drain');
      clock.tick(10_000);

      expect(socket.destroy.called).to.be.false;
    });

    it('disarms the timer when the socket closes', () => {
      const socket = makeUnreadSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      const jsonSocket = new JsonSocket(socket, { drainTimeout: 1000 });

      jsonSocket.sendMessage({ some: 'payload' });
      socket.emit('close');
      clock.tick(10_000);

      expect(socket.destroy.called).to.be.false;
      expect(errors).to.have.lengthOf(0);
    });

    it('can be disabled with 0', () => {
      const socket = makeUnreadSocketStub();
      const jsonSocket = new JsonSocket(socket, { drainTimeout: 0 });

      jsonSocket.sendMessage({ some: 'payload' });
      clock.tick(60_000);

      expect(socket.destroy.called).to.be.false;
    });

    it('does not apply when "pauseOnBackpressure" is false', () => {
      const socket = makeUnreadSocketStub();
      const jsonSocket = new JsonSocket(socket, {
        drainTimeout: 1000,
        pauseOnBackpressure: false,
      });

      jsonSocket.sendMessage({ some: 'payload' });
      clock.tick(10_000);

      expect(socket.destroy.called).to.be.false;
    });
  });
});
