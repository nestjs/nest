import {
  validateModuleKeys,
  INVALID_MODULE_CONFIG_MESSAGE,
} from '../../utils/validate-module-keys.util';

describe('validateModuleKeys', () => {
  describe('when all keys are valid', () => {
    it('should not throw for all valid module metadata keys', () => {
      expect(() =>
        validateModuleKeys(['imports', 'exports', 'controllers', 'providers']),
      ).not.toThrow();
    });

    it('should not throw for a single valid key', () => {
      expect(() => validateModuleKeys(['imports'])).not.toThrow();
    });

    it('should not throw for an empty array', () => {
      expect(() => validateModuleKeys([])).not.toThrow();
    });
  });

  describe('when any key is invalid', () => {
    it('should throw with the invalid key name in the message', () => {
      expect(() => validateModuleKeys(['invalid'])).toThrow(
        "Invalid property 'invalid' passed into the @Module() decorator.",
      );
    });

    it('should throw when mixing valid and invalid keys', () => {
      expect(() =>
        validateModuleKeys(['imports', 'exports', 'bogus']),
      ).toThrow(
        "Invalid property 'bogus' passed into the @Module() decorator.",
      );
    });
  });

  describe('INVALID_MODULE_CONFIG_MESSAGE', () => {
    it('should produce a formatted error string when used as a tagged template', () => {
      const result = INVALID_MODULE_CONFIG_MESSAGE`${'typo_prop'}`;
      expect(result).toBe(
        "Invalid property 'typo_prop' passed into the @Module() decorator.",
      );
    });
  });
});
