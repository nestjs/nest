import { Deserializer } from '../interfaces/deserializer.interface';

export class IdentityDeserializer implements Deserializer {
  deserialize(value: any) {
    return value;
  }
}
