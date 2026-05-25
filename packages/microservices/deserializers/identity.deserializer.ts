import { Deserializer } from '../interfaces/deserializer.interface.js';

/**
 * @publicApi
 */
export class IdentityDeserializer implements Deserializer {
  deserialize(value: any) {
    return value;
  }
}
