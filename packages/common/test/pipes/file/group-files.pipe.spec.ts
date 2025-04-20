import { GroupFilesPipe } from '../../../pipes';
import { expect } from 'chai';

describe('GroupFilesPipe', () => {
  let pipe: GroupFilesPipe;

  beforeEach(() => {
    pipe = new GroupFilesPipe();
  });

  describe('transform', () => {
    it('should return an empty object the input is an empty array', () => {
      expect(pipe.transform([])).to.deep.equal({});
    });

    it('should return input value when it is not an array', () => {
      const inputObj = { foo: 'bar' };

      expect(pipe.transform(inputObj)).to.deep.equal(inputObj);
      expect(pipe.transform('a random string')).to.equal('a random string');
      expect(pipe.transform(null)).to.equal(null);
      expect(pipe.transform(undefined)).to.equal(undefined);
    });

    it('should return input value when one file misses the "fieldname" prop', () => {
      const input = [
        { fieldname: 'foo', mimetype: 'image/png' },
        { fieldname: 'bar', mimetype: 'application/pdf' },
        { mimetype: 'video/mp4' },
      ];

      expect(pipe.transform(input)).to.deep.equal(input);
    });

    it('should group files by fieldname', () => {
      const input = [
        { fieldname: 'foo', mimetype: 'image/png' },
        { fieldname: 'bar', mimetype: 'application/pdf' },
        { fieldname: 'baz', mimetype: 'video/mp4' },
        { fieldname: 'foo', mimetype: 'image/jpeg' },
      ];
      const result = {
        foo: [
          { fieldname: 'foo', mimetype: 'image/png' },
          { fieldname: 'foo', mimetype: 'image/jpeg' },
        ],
        bar: [{ fieldname: 'bar', mimetype: 'application/pdf' }],
        baz: [{ fieldname: 'baz', mimetype: 'video/mp4' }],
      };

      expect(pipe.transform(input)).to.deep.equal(result);
    });
  });
});
