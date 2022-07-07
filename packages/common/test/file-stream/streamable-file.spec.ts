import { expect } from 'chai';
import { Readable } from 'stream';
import { StreamableFile } from '../../file-stream';

describe('StreamableFile', () => {
  describe('when input is a readable stream', () => {
    it('should assign it to a stream class property', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getStream()).to.equal(stream);
    });
  });
  describe('when input is an object with "pipe" method', () => {
    it('should assign it to a stream class property', () => {
      const stream = { pipe: () => {} };
      const streamableFile = new StreamableFile(stream as any);
      expect(streamableFile.getStream()).to.equal(stream);
    });
  });
  describe('when options is empty', () => {
    it('should return application/octet-stream for type and undefined for others', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getHeaders()).to.deep.equal({
        type: 'application/octet-stream',
        disposition: undefined,
        length: undefined,
      });
    });
  });
  describe('when options is defined', () => {
    it('should pass provided headers', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream, {
        type: 'application/pdf',
        disposition: 'inline',
        length: 100,
      });
      expect(streamableFile.getHeaders()).to.deep.equal({
        type: 'application/pdf',
        disposition: 'inline',
        length: 100,
      });
    });
  });
  describe('otherwise', () => {
    describe('when input is a Buffer instance', () => {
      it('should create a readable stream and push the input buffer', () => {
        const buffer = Buffer.from('test');
        const streamableFile = new StreamableFile(buffer);
        const stream = streamableFile.getStream();
        expect(stream.read()).to.equal(buffer);
      });
    });
    describe('when input is a Uint8Array', () => {
      it('should create a readable stream and push the input buffer', () => {
        const buffer = Uint8Array.from([0xab, 0xcd, 0xef, 0x00]);
        const streamableFile = new StreamableFile(buffer);
        const stream = streamableFile.getStream();
        expect(stream.read()).to.deep.equal(Buffer.from(buffer));
      });
    });
  });
});
