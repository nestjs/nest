import {
  DEFAULT_MAX_ERROR_MESSAGES_LENGTH,
  resolveMaxErrorMessagesLength,
} from '../../pipes/validation-errors.constants.js';

describe('resolveMaxErrorMessagesLength', () => {
  it.each([undefined, null, NaN, Number('1mb')])(
    'should use the default for %s',
    value => {
      expect(resolveMaxErrorMessagesLength(value as number)).toBe(
        DEFAULT_MAX_ERROR_MESSAGES_LENGTH,
      );
    },
  );

  it.each([0, 30, Infinity])('should keep %s', value => {
    expect(resolveMaxErrorMessagesLength(value)).toBe(value);
  });
});
