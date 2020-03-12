import { MODULE_METADATA as metadataConstants } from '../constants';

export const INVALID_MODULE_CONFIG_MESSAGE = (
  text: TemplateStringsArray,
  property: string,
) => `Invalid property '${property}' passed into the @Module() decorator.`;

const metadataKeys = [
  metadataConstants.IMPORTS,
  metadataConstants.EXPORTS,
  metadataConstants.CONTROLLERS,
  metadataConstants.PROVIDERS,
];

export function validateModuleKeys(keys: string[]) {
  const validateKey = (key: string) => {
    if (metadataKeys.includes(key)) {
      return;
    }
    throw new Error(INVALID_MODULE_CONFIG_MESSAGE`${key}`);
  };
  keys.forEach(validateKey);
}
