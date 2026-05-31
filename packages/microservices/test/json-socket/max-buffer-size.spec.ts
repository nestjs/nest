import { expect } from 'chai';
import { Socket } from 'net';
import * as sinon from 'sinon';
import { MaxPacketLengthExceededException } from '../../errors/max-packet-length-exceeded.exception';
import { TcpEventsMap } from '../../events/tcp.events';
import { JsonSocket } from '../../helpers/json-socket';

const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4; // 512 MBs in characters with 4 bytes per character (32-bit)

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
