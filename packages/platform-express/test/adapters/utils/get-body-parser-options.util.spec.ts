import { getBodyParserOptions } from '../../../adapters/utils/get-body-parser-options.util.js';

describe('getBodyParserOptions', () => {
  describe('when rawBody is false', () => {
    it('should return empty options when no options provided', () => {
      const result = getBodyParserOptions(false);
      expect(result).toEqual({});
    });

    it('should return provided options unchanged', () => {
      const options = { limit: '10mb', inflate: true };
      const result = getBodyParserOptions(false, options);
      expect(result).toEqual(options);
    });

    it('should not include verify function', () => {
      const result = getBodyParserOptions(false);
      expect(result).not.toHaveProperty('verify');
    });
  });

  describe('when rawBody is true', () => {
    it('should include verify function in options', () => {
      const result = getBodyParserOptions<any>(true);
      expect(result).toHaveProperty('verify');
      expect(result.verify).toBeTypeOf('function');
    });

    it('should merge verify with existing options', () => {
      const options = { limit: '10mb' };
      const result = getBodyParserOptions<any>(true, options);
      expect(result.limit).toBe('10mb');
      expect(result.verify).toBeTypeOf('function');
    });

    describe('verify function (rawBodyParser)', () => {
      it('should assign buffer to req.rawBody when buffer is a Buffer', () => {
        const result = getBodyParserOptions<any>(true);
        const req: any = {};
        const res: any = {};
        const buffer = Buffer.from('test data');

        const returnValue = result.verify(req, res, buffer);

        expect(req.rawBody).toBe(buffer);
        expect(returnValue).toBe(true);
      });

      it('should not assign rawBody when buffer is not a Buffer', () => {
        const result = getBodyParserOptions<any>(true);
        const req: any = {};
        const res: any = {};
        const notBuffer = 'not a buffer';

        const returnValue = result.verify(req, res, notBuffer);

        expect(req.rawBody).toBeUndefined();
        expect(returnValue).toBe(true);
      });

      it('should always return true', () => {
        const result = getBodyParserOptions<any>(true);
        const req: any = {};
        const res: any = {};

        expect(result.verify(req, res, Buffer.from(''))).toBe(true);
        expect(result.verify(req, res, null)).toBe(true);
      });
    });
  });
});
