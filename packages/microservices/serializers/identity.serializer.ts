import { Serializer } from '../interfaces/serializer.interface';

export class IdentitySerializer implements Serializer {
  serialize(value: any) {
    return value;
  }
}
