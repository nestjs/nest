import { expect } from 'chai';
import { Socket } from 'net';
import * as sinon from 'sinon';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception';
import { TcpEventsMap } from '../../events/tcp.events';
import { JsonSocket } from '../../helpers/json-socket';

const DEFAULT_MAX_BUFFER_SIZE = 16 * 1024 * 1024; // in characters

describe('JsonSocket maxBufferSize', () => {
  describe('default maxBufferSize', () => {
    it('should use default maxBufferSize when not provided', () => {
      const socket = new JsonSocket(new Socket());
      expect(socket['maxBufferSize']).to.equal(DEFAULT_MAX_BUFFER_SIZE);
    });

    it('should accept data up to default maxBufferSize', () => {
      const socket = new JsonSocket(new Socket());
      // Account for header length (number + '#')
      // Use a smaller size to ensure total buffer (header + data) doesn't exceed limit
      // Create valid JSON string data
      const headerOverhead = 20; // Approximate header size for large numbers
      const dataSize = DEFAULT_MAX_BUFFER_SIZE - headerOverhead;
      const largeData = '"' + 'x'.repeat(dataSize - 2) + '"'; // Valid JSON string
      const packet = `${largeData.length}#${largeData}`;

      expect(() => {
        socket['handleData'](packet);
      }).to.not.throw();
    });

    it('should throw MaxPacketLengthExceededException when exceeding default maxBufferSize', () => {
      const socket = new JsonSocket(new Socket());
      const largeData = 'x'.repeat(DEFAULT_MAX_BUFFER_SIZE + 1);
      const packet = `${largeData.length}#${largeData}`;

      expect(() => {
        socket['handleData'](packet);
      }).to.throw(MaxPacketLengthExceededException);
    });
  });

  describe('limits that are not a number', () => {
    // e.g. "Number(process.env.MAX_BUFFER_SIZE)" with the variable unset
    [NaN, '16mb' as unknown as number].forEach(maxBufferSize => {
      it(`should use the default maxBufferSize for ${maxBufferSize}`, () => {
        const socket = new JsonSocket(new Socket(), { maxBufferSize });
        expect(socket['maxBufferSize']).to.equal(DEFAULT_MAX_BUFFER_SIZE);
      });
    });

    it('should reject data beyond the default maxBufferSize', () => {
      const netSocket = new Socket();
      const errors: unknown[] = [];
      netSocket.on('error', error => errors.push(error));
      const socket = new JsonSocket(netSocket, { maxBufferSize: NaN });

      // Not a content length, so it is only bounded by "maxBufferSize"
      socket['onData'](Buffer.from('1'.repeat(DEFAULT_MAX_BUFFER_SIZE + 1)));

      expect(errors).to.deep.equal([
        new MaxPacketLengthExceededException(DEFAULT_MAX_BUFFER_SIZE + 1)
          .message,
      ]);
    });

    it('should use the defaults of the other limits', () => {
      const defaults = new JsonSocket(new Socket());
      const socket = new JsonSocket(new Socket(), {
        incompleteMessageTimeout: NaN,
        maxSendBufferSize: NaN,
        drainTimeout: NaN,
      });

      for (const option of [
        'incompleteMessageTimeout',
        'maxSendBufferSize',
        'drainTimeout',
      ]) {
        expect(socket[option]).to.be.greaterThan(0);
        expect(socket[option]).to.equal(defaults[option]);
      }
    });

    it('should keep 0 and Infinity', () => {
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: Infinity,
        incompleteMessageTimeout: 0,
        maxSendBufferSize: 0,
        drainTimeout: 0,
      });

      expect(socket['maxBufferSize']).to.equal(Infinity);
      expect(socket['incompleteMessageTimeout']).to.equal(0);
      expect(socket['maxSendBufferSize']).to.equal(0);
      expect(socket['drainTimeout']).to.equal(0);
    });
  });

  describe('custom maxBufferSize', () => {
    it('should use custom maxBufferSize when provided', () => {
      const customSize = 1000;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      expect(socket['maxBufferSize']).to.equal(customSize);
    });

    it('should accept data up to custom maxBufferSize', () => {
      const customSize = 1000;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      // Account for header length (number + '#')
      // For 1000, header is "1000#" = 5 characters
      const headerOverhead = 5;
      const dataSize = customSize - headerOverhead;
      // Create valid JSON string data
      const data = '"' + 'x'.repeat(dataSize - 2) + '"'; // Valid JSON string
      const packet = `${data.length}#${data}`;

      expect(() => {
        socket['handleData'](packet);
      }).to.not.throw();
    });

    it('should throw MaxPacketLengthExceededException when exceeding custom maxBufferSize', () => {
      const customSize = 1000;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const largeData = 'x'.repeat(customSize + 1);
      const packet = `${largeData.length}#${largeData}`;

      expect(() => {
        socket['handleData'](packet);
      }).to.throw(MaxPacketLengthExceededException);
    });

    it('should throw MaxPacketLengthExceededException with correct buffer length', () => {
      const customSize = 1000;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const largeData = 'x'.repeat(customSize + 100);
      const packet = `${largeData.length}#${largeData}`;
      // Total buffer size will be: header length (5) + data length (1100) = 1105
      const expectedBufferSize = packet.length;

      try {
        socket['handleData'](packet);
        expect.fail('Should have thrown MaxPacketLengthExceededException');
      } catch (err) {
        expect(err).to.be.instanceof(MaxPacketLengthExceededException);
        expect(err.message).to.include(String(expectedBufferSize));
      }
    });
  });

  describe('several packets in one read', () => {
    const maxBufferSize = 100;
    // 60 characters of JSON text, 63 with the header
    const body = 'x'.repeat(58);
    const packet = `60#${JSON.stringify(body)}`;
    // 100 characters of JSON text, exactly the limit
    const fullBody = 'y'.repeat(98);
    const fullPacket = `100#${JSON.stringify(fullBody)}`;

    let netSocket: Socket;
    let socket: JsonSocket;
    let messages: unknown[];
    let errors: unknown[];

    beforeEach(() => {
      netSocket = new Socket();
      socket = new JsonSocket(netSocket, { maxBufferSize });
      messages = [];
      errors = [];
      socket.on('message', message => messages.push(message));
      netSocket.on('error', error => errors.push(error));
    });

    it('should accept packets within the limit that exceed it together', () => {
      expect(() => socket['handleData'](packet.repeat(3))).to.not.throw();
      expect(messages).to.deep.equal([body, body, body]);
    });

    it('should accept a packet of exactly maxBufferSize with its header', () => {
      expect(() => socket['handleData'](fullPacket)).to.not.throw();
      expect(messages).to.deep.equal([fullBody]);
    });

    it('should accept the start of the next packet after the end of one', () => {
      socket['handleData'](fullPacket.substring(0, 50));
      expect(() =>
        socket['handleData'](
          fullPacket.substring(50) + fullPacket.substring(0, 80),
        ),
      ).to.not.throw();
      socket['handleData'](fullPacket.substring(80));

      expect(messages).to.deep.equal([fullBody, fullBody]);
    });

    it('should accept them once backpressure is released', () => {
      socket['applyBackpressure']();
      socket['handleData'](packet.repeat(3));
      expect(messages).to.have.lengthOf(0);

      netSocket.emit('drain');

      expect(errors).to.deep.equal([]);
      expect(messages).to.deep.equal([body, body, body]);
    });

    it('should still reject a packet above the limit that follows one within it', () => {
      expect(() =>
        socket['handleData'](`${packet}101#${'z'.repeat(101)}`),
      ).to.throw(MaxPacketLengthExceededException);
      expect(messages).to.deep.equal([body]);
      expect(socket['buffer']).to.equal('');
    });

    it('should still reject a packet above the limit once more than the limit of it is read', () => {
      // Its header is read first and its declared length kept, which allows
      // no more than the limit to be buffered either
      socket['handleData']('1000#');
      socket['handleData']('"' + 'z'.repeat(60));
      expect(() => socket['handleData']('z'.repeat(60))).to.throw(
        MaxPacketLengthExceededException,
      );
      expect(messages).to.deep.equal([]);
      expect(socket['buffer']).to.equal('');
    });

    it('should still reject data without a header that follows a packet', () => {
      expect(() =>
        socket['handleData'](`${packet}${'1'.repeat(101)}`),
      ).to.throw(MaxPacketLengthExceededException);
      expect(messages).to.deep.equal([body]);
    });

    it('should ignore what follows once the limit was exceeded', () => {
      expect(() => socket['handleData']('1'.repeat(101))).to.throw(
        MaxPacketLengthExceededException,
      );
      socket['handleData'](packet);

      expect(messages).to.deep.equal([]);
      expect(socket['buffer']).to.equal('');
      expect(socket['contentLength']).to.be.null;
    });
  });

  describe('chunked data exceeding maxBufferSize', () => {
    it('should throw MaxPacketLengthExceededException when chunked data exceeds limit', () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });

      // Send data in chunks without a valid header delimiter
      // This will accumulate in the buffer without being processed
      // First chunk: partial header
      socket['handleData']('50');

      // Second chunk: more data that accumulates beyond limit
      // Buffer now has "50" (2 chars), send enough to exceed customSize
      const exceedingData = 'x'.repeat(customSize);
      expect(() => {
        socket['handleData'](exceedingData);
      }).to.throw(MaxPacketLengthExceededException);
    });

    it('should clear buffer after throwing MaxPacketLengthExceededException', () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const largeData = 'x'.repeat(customSize + 1);
      const packet = `${largeData.length}#${largeData}`;

      try {
        socket['handleData'](packet);
      } catch (err) {
        // Expected
      }

      expect(socket['buffer']).to.equal('');
    });
  });

  describe('error handling when maxBufferSize exceeded', () => {
    it(`should emit ${TcpEventsMap.ERROR} event when maxBufferSize is exceeded`, () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const socketEmitSpy: sinon.SinonSpy<any, any> = sinon.spy(
        socket['socket'],
        'emit',
      );

      const largeData = 'x'.repeat(customSize + 1);
      const packet = Buffer.from(`${largeData.length}#${largeData}`);

      socket['onData'](packet);

      expect(socketEmitSpy.called).to.be.true;
      expect(socketEmitSpy.calledWith(TcpEventsMap.ERROR)).to.be.true;
      socketEmitSpy.restore();
    });

    it(`should send a FIN packet when maxBufferSize is exceeded`, () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const socketEndSpy = sinon.spy(socket['socket'], 'end');

      const largeData = 'x'.repeat(customSize + 1);
      const packet = Buffer.from(`${largeData.length}#${largeData}`);

      socket['onData'](packet);

      expect(socketEndSpy.calledOnce).to.be.true;
      socketEndSpy.restore();
    });
  });

  describe('edge cases', () => {
    it('should handle maxBufferSize of 0', () => {
      const socket = new JsonSocket(new Socket(), { maxBufferSize: 0 });
      expect(socket['maxBufferSize']).to.equal(0);

      const packet = '5#"test"';
      expect(() => {
        socket['handleData'](packet);
      }).to.throw(MaxPacketLengthExceededException);
    });

    it('should handle very large custom maxBufferSize', () => {
      const veryLargeSize = 10 * 1024 * 1024; // 10MB in characters
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: veryLargeSize,
      });
      expect(socket['maxBufferSize']).to.equal(veryLargeSize);

      // Account for header length (number + '#')
      // For 10MB, header is approximately "10485760#" = 10 characters
      const headerOverhead = 20; // Safe overhead for large numbers
      const dataSize = veryLargeSize - headerOverhead;
      // Create valid JSON string data
      const data = '"' + 'x'.repeat(dataSize - 2) + '"'; // Valid JSON string
      const packet = `${data.length}#${data}`;

      expect(() => {
        socket['handleData'](packet);
      }).to.not.throw();
    });

    it('should handle maxBufferSize exactly at the limit', () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      // Account for header: "100#" = 4 characters
      // So data can be 100 - 4 = 96 characters to stay at limit
      const headerOverhead = 4;
      const dataSize = customSize - headerOverhead;
      // Create valid JSON string data
      const data = '"' + 'x'.repeat(dataSize - 2) + '"'; // Valid JSON string
      const packet = `${data.length}#${data}`;

      // Should not throw when exactly at limit
      expect(() => {
        socket['handleData'](packet);
      }).to.not.throw();
    });
  });
});
