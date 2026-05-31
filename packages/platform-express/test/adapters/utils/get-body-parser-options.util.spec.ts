import { expect } from 'chai';
import { getBodyParserOptions } from '../../../adapters/utils/get-body-parser-options.util';

describe('getBodyParserOptions', () => {
  describe('when rawBody is false', () => {
    it('should return empty options when no options provided', () => {
      const result = getBodyParserOptions(false);
      expect(result).to.deep.equal({});
    });

    it('should return provided options unchanged', () => {
      const options = { limit: '10mb', inflate: true };
      const result = getBodyParserOptions(false, options);
      expect(result).to.deep.equal(options);
    });

    it('should not include verify function', () => {
      const result = getBodyParserOptions(false);
      expect(result).to.not.have.property('verify');
    });
  });

  describe('when rawBody is true', () => {
    it('should include verify function in options', () => {
      const result = getBodyParserOptions<any>(true);
      expect(result).to.have.property('verify');
      expect(result.verify).to.be.a('function');
    });

    it('should merge verify with existing options', () => {
      const options = { limit: '10mb' };
      const result = getBodyParserOptions<any>(true, options);
      expect(result.limit).to.equal('10mb');
      expect(result.verify).to.be.a('function');
    });

    describe('verify function (rawBodyParser)', () => {
      it('should assign buffer to req.rawBody when buffer is a Buffer', () => {
        const result = getBodyParserOptions<any>(true);
        const req: any = {};
        const res: any = {};
        const buffer = Buffer.from('test data');

        const returnValue = result.verify(req, res, buffer);

        expect(req.rawBody).to.equal(buffer);
        expect(returnValue).to.be.true;
      });

      it('should not assign rawBody when buffer is not a Buffer', () => {
        const result = getBodyParserOptions<any>(true);
        const req: any = {};
        const res: any = {};
        const notBuffer = 'not a buffer';

        const returnValue = result.verify(req, res, notBuffer);

        expect(req.rawBody).to.be.undefined;
        expect(returnValue).to.be.true;
      });

      it('should always return true', () => {
        const result = getBodyParserOptions<any>(true);
        const req: any = {};
        const res: any = {};

        expect(result.verify(req, res, Buffer.from(''))).to.be.true;
        expect(result.verify(req, res, null)).to.be.true;
      });
    });
  });
});
