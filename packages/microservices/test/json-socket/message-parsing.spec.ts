import { expect } from 'chai';
import { Socket } from 'net';
import * as sinon from 'sinon';
import { ERROR_EVENT, MESSAGE_EVENT } from '../../constants';
import { JsonSocket } from '../../helpers/json-socket';

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
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal('Hello there');
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse JSON numbers', () => {
    socket['handleData']('5#12.34');
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal(12.34);
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse JSON bools', () => {
    socket['handleData']('4#true');
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal(true);
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse JSON objects', () => {
    socket['handleData']('17#{"a":"yes","b":9}');
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal({ a: 'yes', b: 9 });
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse JSON arrays', () => {
    socket['handleData']('9#["yes",9]');
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal(['yes', 9]);
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse multiple messages in one packet', () => {
    socket['handleData']('5#"hey"4#true');
    expect(messages.length).to.deep.equal(2);
    expect(messages[0]).to.deep.equal('hey');
    expect(messages[1]).to.deep.equal(true);
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse chunked messages', () => {
    socket['handleData']('13#"Hel');
    socket['handleData']('lo there"');
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal('Hello there');
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse chunked and multiple messages', () => {
    socket['handleData']('13#"Hel');
    socket['handleData']('lo there"4#true');
    expect(messages.length).to.deep.equal(2);
    expect(messages[0]).to.deep.equal('Hello there');
    expect(messages[1]).to.deep.equal(true);
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse chunked messages with multi-byte characters', () => {
    // 0x33 0x23 0xd8 0x22 0xa9 0x22 = 3#"ة" (U+00629)
    socket['onData'](Buffer.from([0x33, 0x23, 0x22, 0xd8]));
    socket['onData'](Buffer.from([0xa9, 0x22]));
    expect(messages.length).to.deep.equal(1);
    expect(messages[0]).to.deep.equal('ة');
  });

  it('should parse multiple messages with unicode correctly', () => {
    socket['handleData']('41#"Diese Zeile enthält das Unicode-Zeichen"4#true');
    expect(messages[0]).to.deep.equal(
      'Diese Zeile enthält das Unicode-Zeichen',
    );
    expect(messages[1]).to.deep.equal(true);
    expect(socket['buffer']).to.deep.equal('');
  });

  it('should parse multiple and chunked messages with unicode correctly', () => {
    socket['handleData']('41#"Diese Zeile enthält ');
    socket['handleData']('das Unicode-Zeichen"4#true');
    expect(messages[0]).to.deep.equal(
      'Diese Zeile enthält das Unicode-Zeichen',
    );
    expect(messages[1]).to.deep.equal(true);
    expect(socket['buffer']).to.deep.equal('');
  });

  describe('Error handling', () => {
    describe('JSON Error', () => {
      const errorMsg = `Could not parse JSON: Unexpected end of JSON input\nRequest data: "Hel`;
      const packetString = '4#"Hel';
      const packet = Buffer.from(packetString);

      it('should fail to parse invalid JSON', () => {
        try {
          socket['handleData']('4#"Hel');
        } catch (err) {
          expect(err.message).to.deep.equal(errorMsg);
        }
        expect(messages.length).to.deep.equal(0);
        expect(socket['buffer']).to.deep.equal('');
      });

      it(`should emit ${ERROR_EVENT} event on socket`, () => {
        const socketEmitSpy: sinon.SinonSpy<any, any> = sinon.spy(
          socket['socket'],
          'emit',
        );

        socket['onData'](packet);

        expect(socketEmitSpy.calledOnceWithExactly(ERROR_EVENT, errorMsg)).to.be
          .true;
        socketEmitSpy.restore();
      });

      it(`should send a FIN packet`, () => {
        const socketEndSpy = sinon.spy(socket['socket'], 'end');

        socket['onData'](packet);

        expect(socketEndSpy.calledOnce).to.be.true;
        socketEndSpy.restore();
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
          expect(err.message).to.deep.equal(errorMsg);
        }
        expect(messages.length).to.deep.equal(0);
        expect(socket['buffer']).to.deep.equal('');
      });

      it(`should emit ${ERROR_EVENT} event on socket`, () => {
        const socketEmitSpy: sinon.SinonSpy<any, any> = sinon.spy(
          socket['socket'],
          'emit',
        );

        socket['onData'](packet);

        expect(socketEmitSpy.calledOnceWithExactly(ERROR_EVENT, errorMsg)).to.be
          .true;
        socketEmitSpy.restore();
      });

      it(`should send a FIN packet`, () => {
        const socketEndSpy = sinon.spy(socket['socket'], 'end');

        socket['onData'](packet);

        expect(socketEndSpy.calledOnce).to.be.true;
        socketEndSpy.restore();
      });
    });
  });
});
