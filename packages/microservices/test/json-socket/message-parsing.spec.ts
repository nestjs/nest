import { Socket } from 'net';
import { JsonSocket } from '../../helpers/json-socket.js';

const MESSAGE_EVENT = 'message';

describe('JsonSocket message parsing', () => {
  const socket = new JsonSocket(new Socket());
  let messages: string[] = [];

  socket.on(MESSAGE_EVENT, message => {
    messages.push(message);
  });

  beforeEach(() => {
    messages = [];
    socket['contentLength'] = null;
    socket['buffer'] = '';
  });

  it('should parse JSON strings', () => {
    socket['handleData']('13#"Hello there"');
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual('Hello there');
    expect(socket['buffer']).toEqual('');
  });

  it('should parse JSON numbers', () => {
    socket['handleData']('5#12.34');
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual(12.34);
    expect(socket['buffer']).toEqual('');
  });

  it('should parse JSON bools', () => {
    socket['handleData']('4#true');
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual(true);
    expect(socket['buffer']).toEqual('');
  });

  it('should parse JSON objects', () => {
    socket['handleData']('17#{"a":"yes","b":9}');
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual({ a: 'yes', b: 9 });
    expect(socket['buffer']).toEqual('');
  });

  it('should parse JSON arrays', () => {
    socket['handleData']('9#["yes",9]');
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual(['yes', 9]);
    expect(socket['buffer']).toEqual('');
  });

  it('should parse multiple messages in one packet', () => {
    socket['handleData']('5#"hey"4#true');
    expect(messages.length).toEqual(2);
    expect(messages[0]).toEqual('hey');
    expect(messages[1]).toEqual(true);
    expect(socket['buffer']).toEqual('');
  });

  it('should parse chunked messages', () => {
    socket['handleData']('13#"Hel');
    socket['handleData']('lo there"');
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual('Hello there');
    expect(socket['buffer']).toEqual('');
  });

  it('should parse chunked and multiple messages', () => {
    socket['handleData']('13#"Hel');
    socket['handleData']('lo there"4#true');
    expect(messages.length).toEqual(2);
    expect(messages[0]).toEqual('Hello there');
    expect(messages[1]).toEqual(true);
    expect(socket['buffer']).toEqual('');
  });

  it('should parse chunked messages with multi-byte characters', () => {
    // 0x33 0x23 0xd8 0x22 0xa9 0x22 = 3#"ة" (U+00629)
    socket['onData'](Buffer.from([0x33, 0x23, 0x22, 0xd8]));
    socket['onData'](Buffer.from([0xa9, 0x22]));
    expect(messages.length).toEqual(1);
    expect(messages[0]).toEqual('ة');
  });

  it('should parse multiple messages with unicode correctly', () => {
    socket['handleData']('41#"Diese Zeile enthält das Unicode-Zeichen"4#true');
    expect(messages[0]).toEqual('Diese Zeile enthält das Unicode-Zeichen');
    expect(messages[1]).toEqual(true);
    expect(socket['buffer']).toEqual('');
  });

  it('should parse multiple and chunked messages with unicode correctly', () => {
    socket['handleData']('41#"Diese Zeile enthält ');
    socket['handleData']('das Unicode-Zeichen"4#true');
    expect(messages[0]).toEqual('Diese Zeile enthält das Unicode-Zeichen');
    expect(messages[1]).toEqual(true);
    expect(socket['buffer']).toEqual('');
  });

  describe('Error handling', () => {
    describe('JSON Error', () => {
      const errorMsgNodeAboveV20 = `Could not parse JSON: Unterminated string in JSON at position 4 (line 1 column 5)\nRequest data: "Hel`;
      const errorMsg = `Could not parse JSON: Unterminated string in JSON at position 4\nRequest data: "Hel`;
      const packetString = '4#"Hel';
      const packet = Buffer.from(packetString);

      it('should fail to parse invalid JSON', () => {
        try {
          socket['handleData']('4#"Hel');
        } catch (err) {
          expect([errorMsgNodeAboveV20, errorMsg]).toContain(err.message);
        }
        expect(messages.length).toEqual(0);
        expect(socket['buffer']).toEqual('');
      });

      it('should emit error event on socket', () => {
        const socketEmitSpy: ReturnType<typeof vi.fn> = vi.spyOn(
          socket['socket'],
          'emit',
        );

        socket['onData'](packet);

        try {
          expect(socketEmitSpy).toHaveBeenCalledWith('error', errorMsg);
        } catch (err) {
          expect(socketEmitSpy).toHaveBeenCalledWith(
            'error',
            errorMsgNodeAboveV20,
          );
        } finally {
          socketEmitSpy.mockRestore();
        }
      });

      it(`should send a FIN packet`, () => {
        const socketEndSpy = vi.spyOn(socket['socket'], 'end');

        socket['onData'](packet);

        expect(socketEndSpy).toHaveBeenCalledOnce();
        socketEndSpy.mockRestore();
      });
    });

    describe('Corrupted length value', () => {
      const errorMsg = `Corrupted length value "wtf" supplied in a packet`;
      const packetString = 'wtf#"Hello"';
      const packet = Buffer.from(packetString);

      it('should not accept invalid content length', () => {
        try {
          socket['handleData'](packetString);
        } catch (err) {
          expect(err.message).toEqual(errorMsg);
        }
        expect(messages.length).toEqual(0);
        expect(socket['buffer']).toEqual('');
      });

      it('should emit error event on socket', () => {
        const socketEmitSpy: ReturnType<typeof vi.fn> = vi.spyOn(
          socket['socket'],
          'emit',
        );

        socket['onData'](packet);

        try {
          expect(socketEmitSpy).toHaveBeenCalledWith('error', errorMsg);
        } catch {
          // Do nothing
        } finally {
          socketEmitSpy.mockRestore();
        }
      });

      it(`should send a FIN packet`, () => {
        const socketEndSpy = vi.spyOn(socket['socket'], 'end');

        socket['onData'](packet);

        expect(socketEndSpy).toHaveBeenCalledOnce();
        socketEndSpy.mockRestore();
      });
    });
  });
});
