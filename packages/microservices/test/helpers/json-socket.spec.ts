import { EventEmitter } from 'events';
import { CorruptedPacketLengthException } from '../../errors/corrupted-packet-length.exception.js';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception.js';
import { JsonSocket } from '../../helpers/json-socket.js';

function makeSocketStub(): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    write: vi.fn(),
    end: vi.fn(),
    connect: vi.fn(),
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
});
