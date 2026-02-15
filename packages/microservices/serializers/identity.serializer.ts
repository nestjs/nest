import { Serializer } from '../interfaces/serializer.interface.js';

export class IdentitySerializer implements Serializer {
  serialize(value: any) {
    return value;
  }
}
