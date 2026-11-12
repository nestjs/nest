import { Socket } from 'net';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception.js';
import { JsonSocket } from '../../helpers/json-socket.js';

const DEFAULT_MAX_BUFFER_SIZE = 16 * 1024 * 1024; // in characters

describe('JsonSocket maxBufferSize', () => {
  describe('default maxBufferSize', () => {
    it('should use default maxBufferSize when not provided', () => {
      const socket = new JsonSocket(new Socket());
      expect(socket['maxBufferSize']).toBe(DEFAULT_MAX_BUFFER_SIZE);
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
      }).not.toThrow();
    });

    it('should throw MaxPacketLengthExceededException when exceeding default maxBufferSize', () => {
      const socket = new JsonSocket(new Socket());
      const largeData = 'x'.repeat(DEFAULT_MAX_BUFFER_SIZE + 1);
      const packet = `${largeData.length}#${largeData}`;

      expect(() => {
        socket['handleData'](packet);
      }).toThrow(MaxPacketLengthExceededException);
    });
  });

  describe('limits that are not a number', () => {
    // e.g. "Number(process.env.MAX_BUFFER_SIZE)" with the variable unset
    it.each([NaN, '16mb' as unknown as number])(
      'should use the default maxBufferSize for %s',
      maxBufferSize => {
        const socket = new JsonSocket(new Socket(), { maxBufferSize });
        expect(socket['maxBufferSize']).toBe(DEFAULT_MAX_BUFFER_SIZE);
      },
    );

    it('should reject a packet declaring more than the default maxBufferSize', () => {
      const netSocket = new Socket();
      const errors: unknown[] = [];
      netSocket.on('error', error => errors.push(error));
      const socket = new JsonSocket(netSocket, { maxBufferSize: NaN });

      socket['handleData'](`${DEFAULT_MAX_BUFFER_SIZE + 1}#`);

      expect(errors).toEqual([
        new MaxPacketLengthExceededException(DEFAULT_MAX_BUFFER_SIZE + 1)
          .message,
      ]);
      expect(netSocket.destroyed).toBe(true);
    });

    it('should use the defaults of the other limits', () => {
      const defaults = new JsonSocket(new Socket());
      const socket = new JsonSocket(new Socket(), {
        incompleteMessageTimeout: NaN,
        messageReceiveTimeout: NaN,
        maxSendBufferSize: NaN,
        drainTimeout: NaN,
      });

      for (const option of [
        'incompleteMessageTimeout',
        'messageReceiveTimeout',
        'maxSendBufferSize',
        'drainTimeout',
      ]) {
        expect(socket[option]).toBeGreaterThan(0);
        expect(socket[option]).toBe(defaults[option]);
      }
    });

    it('should keep 0 and Infinity', () => {
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: Infinity,
        incompleteMessageTimeout: 0,
        messageReceiveTimeout: 0,
        maxSendBufferSize: 0,
        drainTimeout: 0,
      });

      expect(socket['maxBufferSize']).toBe(Infinity);
      expect(socket['incompleteMessageTimeout']).toBe(0);
      expect(socket['messageReceiveTimeout']).toBe(0);
      expect(socket['maxSendBufferSize']).toBe(0);
      expect(socket['drainTimeout']).toBe(0);
    });
  });

  describe('custom maxBufferSize', () => {
    it('should use custom maxBufferSize when provided', () => {
      const customSize = 1000;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      expect(socket['maxBufferSize']).toBe(customSize);
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
      }).not.toThrow();
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
      }).toThrow(MaxPacketLengthExceededException);
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

      expect(() => {
        socket['handleData'](packet);
      }).toThrow(String(expectedBufferSize));
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
      expect(() => socket['handleData'](packet.repeat(3))).not.toThrow();
      expect(messages).toEqual([body, body, body]);
    });

    it('should accept a packet of exactly maxBufferSize with its header', () => {
      expect(() => socket['handleData'](fullPacket)).not.toThrow();
      expect(messages).toEqual([fullBody]);
    });

    it('should accept the start of the next packet after the end of one', () => {
      socket['handleData'](fullPacket.substring(0, 50));
      expect(() =>
        socket['handleData'](
          fullPacket.substring(50) + fullPacket.substring(0, 80),
        ),
      ).not.toThrow();
      socket['handleData'](fullPacket.substring(80));

      expect(messages).toEqual([fullBody, fullBody]);
    });

    it('should accept them once backpressure is released', () => {
      socket['applyBackpressure']();
      socket['handleData'](packet.repeat(3));
      expect(messages).toHaveLength(0);

      netSocket.emit('drain');

      expect(errors).toEqual([]);
      expect(messages).toEqual([body, body, body]);
    });

    it('should still reject a packet above the limit that follows one within it', () => {
      expect(() =>
        socket['handleData'](`${packet}101#${'z'.repeat(101)}`),
      ).toThrow(MaxPacketLengthExceededException);
      expect(messages).toEqual([body]);
      expect(socket['buffer']).toBe('');
    });

    it('should still reject data without a header that follows a packet', () => {
      expect(() => socket['handleData'](`${packet}${'1'.repeat(101)}`)).toThrow(
        MaxPacketLengthExceededException,
      );
      expect(messages).toEqual([body]);
    });

    it('should ignore what follows once the limit was exceeded', () => {
      expect(() => socket['handleData']('1'.repeat(101))).toThrow(
        MaxPacketLengthExceededException,
      );
      socket['handleData'](packet);

      expect(messages).toEqual([]);
      expect(socket['buffer']).toBe('');
      expect(socket['contentLength']).toBeNull();
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
      }).toThrow(MaxPacketLengthExceededException);
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

      expect(socket['buffer']).toBe('');
    });
  });

  describe('error handling when maxBufferSize exceeded', () => {
    it('should emit error event when maxBufferSize is exceeded', () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const socketEmitSpy: ReturnType<typeof vi.fn> = vi.spyOn(
        socket['socket'],
        'emit',
      );

      const largeData = 'x'.repeat(customSize + 1);
      const packet = Buffer.from(`${largeData.length}#${largeData}`);

      socket['onData'](packet);

      expect(socketEmitSpy).toHaveBeenCalled();
      expect(socketEmitSpy).toHaveBeenCalledWith('error', expect.any(String));
      socketEmitSpy.mockRestore();
    });

    it('should send a FIN packet when maxBufferSize is exceeded', () => {
      const customSize = 100;
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: customSize,
      });
      const socketEndSpy = vi.spyOn(socket['socket'], 'end');

      const largeData = 'x'.repeat(customSize + 1);
      const packet = Buffer.from(`${largeData.length}#${largeData}`);

      socket['onData'](packet);

      expect(socketEndSpy).toHaveBeenCalledOnce();
      socketEndSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle maxBufferSize of 0', () => {
      const socket = new JsonSocket(new Socket(), { maxBufferSize: 0 });
      expect(socket['maxBufferSize']).toBe(0);

      const packet = '5#"test"';
      expect(() => {
        socket['handleData'](packet);
      }).toThrow(MaxPacketLengthExceededException);
    });

    it('should handle very large custom maxBufferSize', () => {
      const veryLargeSize = 10 * 1024 * 1024; // 10MB in characters
      const socket = new JsonSocket(new Socket(), {
        maxBufferSize: veryLargeSize,
      });
      expect(socket['maxBufferSize']).toBe(veryLargeSize);

      // Account for header length (number + '#')
      // For 10MB, header is approximately "10485760#" = 10 characters
      const headerOverhead = 20; // Safe overhead for large numbers
      const dataSize = veryLargeSize - headerOverhead;
      // Create valid JSON string data
      const data = '"' + 'x'.repeat(dataSize - 2) + '"'; // Valid JSON string
      const packet = `${data.length}#${data}`;

      expect(() => {
        socket['handleData'](packet);
      }).not.toThrow();
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
      }).not.toThrow();
    });
  });
});
