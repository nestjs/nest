import { Deserializer } from '../interfaces/deserializer.interface';

/**
 * @publicApi
 */
export class IdentityDeserializer implements Deserializer {
  deserialize(value: any) {
    return value;
  }
}
