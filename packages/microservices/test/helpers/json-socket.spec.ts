import { EventEmitter } from 'events';
import { CorruptedPacketLengthException } from '../../errors/corrupted-packet-length.exception.js';
import { IncompleteMessageTimeoutException } from '../../errors/incomplete-message-timeout.exception.js';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception.js';
import { MaxSendBufferSizeExceededException } from '../../errors/max-send-buffer-size-exceeded.exception.js';
import { JsonSocket } from '../../helpers/json-socket.js';

function makeSocketStub(): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    write: vi.fn(),
    end: vi.fn(),
    connect: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn(),
    writableLength: 0,
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

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ hello: 'world' });
    });

    it('buffers a partial chunk and emits once complete', () => {
      const full = frame({ x: 1 });
      (jsonSocket as any).handleData(full.slice(0, 3));
      expect(received).toHaveLength(0);

      (jsonSocket as any).handleData(full.slice(3));
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ x: 1 });
    });

    it('emits multiple messages split across chunks', () => {
      const payload = frame({ a: 1 }) + frame({ b: 2 });
      const mid = Math.floor(payload.length / 2);
      (jsonSocket as any).handleData(payload.slice(0, mid));
      (jsonSocket as any).handleData(payload.slice(mid));

      expect(received).toHaveLength(2);
      expect(received[0]).toEqual({ a: 1 });
      expect(received[1]).toEqual({ b: 2 });
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
      }).not.toThrow();

      expect(received).toHaveLength(FRAME_COUNT);
    });

    it('correctly identifies all message payloads in a pipelined burst', () => {
      const messages = Array.from({ length: 500 }, (_, i) => ({ id: i }));
      const payload = messages.map(frame).join('');

      (jsonSocket as any).handleData(payload);

      expect(received).toHaveLength(messages.length);
      messages.forEach((msg, i) => {
        expect(received[i]).toEqual(msg);
      });
    });
  });

  describe('handleData – error cases', () => {
    it('throws CorruptedPacketLengthException for a non-numeric length prefix', () => {
      expect(() => {
        (jsonSocket as any).handleData('abc#{}');
      }).toThrow(CorruptedPacketLengthException);
    });

    it('throws MaxPacketLengthExceededException when buffer exceeds maxBufferSize', () => {
      const tiny = new JsonSocket(socketStub, { maxBufferSize: 5 });
      expect(() => {
        (tiny as any).handleData('123456#');
      }).toThrow(MaxPacketLengthExceededException);
    });

    it('resets state after a corrupted length so subsequent valid frames are processed', () => {
      expect(() => (jsonSocket as any).handleData('bad#')).toThrow(
        CorruptedPacketLengthException,
      );
      // After the error the socket state must be clean
      (jsonSocket as any).handleData(frame({ ok: true }));
      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ ok: true });
    });
  });

  describe('incomplete message timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('drops a connection that goes silent in the middle of a packet', () => {
      const socket = makeSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      const jsonSocket = new JsonSocket(socket, {
        incompleteMessageTimeout: 1000,
      });

      // A packet declaring far more data than is ever sent.
      (jsonSocket as any).handleData('999999#partial');
      expect(socket.destroy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(socket.destroy).toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(
        new IncompleteMessageTimeoutException(7, 1000).message,
      );
    });

    it('does not interrupt a slow but progressing transfer', () => {
      const socket = makeSocketStub();
      const jsonSocket = new JsonSocket(socket, {
        incompleteMessageTimeout: 1000,
      });

      (jsonSocket as any).handleData('12#');
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(900);
        (jsonSocket as any).handleData('ab');
      }

      // 4500ms elapsed against a 1000ms timeout, but the peer kept sending.
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it('disarms the timer once the packet is complete', () => {
      const socket = makeSocketStub();
      const received: unknown[] = [];
      socket.on('message', (msg: unknown) => received.push(msg));
      const jsonSocket = new JsonSocket(socket, {
        incompleteMessageTimeout: 1000,
      });

      (jsonSocket as any).handleData(frame({ hello: 'world' }));
      vi.advanceTimersByTime(10_000);

      expect(received).toHaveLength(1);
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it('can be disabled with 0', () => {
      const socket = makeSocketStub();
      const jsonSocket = new JsonSocket(socket, {
        incompleteMessageTimeout: 0,
      });

      (jsonSocket as any).handleData('999999#partial');
      vi.advanceTimersByTime(10_000);

      expect(socket.destroy).not.toHaveBeenCalled();
    });
  });

  describe('write backpressure', () => {
    it('pauses reading when the outgoing buffer is above the high-water mark', () => {
      const socket = makeSocketStub();
      socket.write.mockReturnValue(false);
      const jsonSocket = new JsonSocket(socket);

      jsonSocket.sendMessage({ some: 'payload' });

      expect(socket.pause).toHaveBeenCalled();
    });

    it('does not pause reading while writes are flushed', () => {
      const socket = makeSocketStub();
      socket.write.mockReturnValue(true);
      const jsonSocket = new JsonSocket(socket);

      jsonSocket.sendMessage({ some: 'payload' });

      expect(socket.pause).not.toHaveBeenCalled();
    });

    it('resumes reading once the socket drains', () => {
      const socket = makeSocketStub();
      socket.write.mockReturnValue(false);
      const jsonSocket = new JsonSocket(socket);

      jsonSocket.sendMessage({ some: 'payload' });
      socket.emit('drain');

      expect(socket.resume).toHaveBeenCalled();
    });

    it('stops turning buffered frames into responses until the socket drains', () => {
      const socket = makeSocketStub();
      const received: unknown[] = [];
      const jsonSocket = new JsonSocket(socket);
      // Every inbound message triggers a response that does not flush.
      socket.write.mockReturnValue(false);
      socket.on('message', (msg: unknown) => {
        received.push(msg);
        jsonSocket.sendMessage({ re: msg });
      });

      // Three pipelined requests arriving in a single read event.
      (jsonSocket as any).handleData(
        frame({ n: 1 }) + frame({ n: 2 }) + frame({ n: 3 }),
      );

      expect(received).toHaveLength(1);
      expect(socket.pause).toHaveBeenCalled();

      socket.write.mockReturnValue(true);
      socket.emit('drain');

      expect(received).toHaveLength(3);
    });
  });

  describe('max send buffer size', () => {
    it('drops a peer that lets responses pile up beyond the limit', () => {
      const socket = makeSocketStub();
      const errors: string[] = [];
      socket.on('error', (message: string) => errors.push(message));
      socket.write.mockImplementation(() => {
        socket.writableLength = 2048;
        return false;
      });
      const jsonSocket = new JsonSocket(socket, { maxSendBufferSize: 1024 });

      jsonSocket.sendMessage({ some: 'payload' });

      expect(socket.destroy).toHaveBeenCalled();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(
        new MaxSendBufferSizeExceededException(2048, 1024).message,
      );
    });

    it('leaves a peer that stays within the limit alone', () => {
      const socket = makeSocketStub();
      socket.write.mockImplementation(() => {
        socket.writableLength = 512;
        return false;
      });
      const jsonSocket = new JsonSocket(socket, { maxSendBufferSize: 1024 });

      jsonSocket.sendMessage({ some: 'payload' });

      expect(socket.destroy).not.toHaveBeenCalled();
      expect(socket.pause).toHaveBeenCalled();
    });

    it('can be disabled with 0', () => {
      const socket = makeSocketStub();
      socket.write.mockImplementation(() => {
        socket.writableLength = 1024 * 1024 * 1024;
        return false;
      });
      const jsonSocket = new JsonSocket(socket, { maxSendBufferSize: 0 });

      jsonSocket.sendMessage({ some: 'payload' });

      expect(socket.destroy).not.toHaveBeenCalled();
    });
  });
});
