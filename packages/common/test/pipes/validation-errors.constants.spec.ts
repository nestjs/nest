import { expect } from 'chai';
import {
  DEFAULT_MAX_ERROR_MESSAGES_LENGTH,
  resolveMaxErrorMessagesLength,
} from '../../pipes/validation-errors.constants';

describe('resolveMaxErrorMessagesLength', () => {
  [undefined, null, NaN, Number('1mb')].forEach(value => {
    it(`should use the default for ${value}`, () => {
      expect(resolveMaxErrorMessagesLength(value as number)).to.equal(
        DEFAULT_MAX_ERROR_MESSAGES_LENGTH,
      );
    });
  });

  [0, 30, Infinity].forEach(value => {
    it(`should keep ${value}`, () => {
      expect(resolveMaxErrorMessagesLength(value)).to.equal(value);
    });
  });
});
