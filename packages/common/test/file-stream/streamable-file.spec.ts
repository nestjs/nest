import { expect } from 'chai';
import { Readable } from 'stream';
import { StreamableFile } from '../../file-stream';

describe('StreamableFile', () => {
  describe('when input is a readable stream', () => {
    it('should assing it to a stream class property', () => {
      const stream = new Readable();
      const streamableFile = new StreamableFile(stream);
      expect(streamableFile.getStream()).to.equal(stream);
    });
  });
  describe('when input is an object with "pipe" method', () => {
    it('should assing it to a stream class property', () => {
      const stream = { pipe: () => {} };
      const streamableFile = new StreamableFile(stream as any);
      expect(streamableFile.getStream()).to.equal(stream);
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
