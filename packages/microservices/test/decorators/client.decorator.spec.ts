import {
  CLIENT_METADATA,
  CLIENT_CONFIGURATION_METADATA,
} from '../../constants.js';
import { Client } from '../../decorators/client.decorator.js';

describe('@Client', () => {
  const pattern = { role: 'test' };
  class TestComponent {
    @Client(pattern as any)
    public static instance;
  }
  it(`should enhance property with metadata`, () => {
    const isClient = Reflect.getOwnMetadata(
      CLIENT_METADATA,
      TestComponent,
      'instance',
    );
    const config = Reflect.getOwnMetadata(
      CLIENT_CONFIGURATION_METADATA,
      TestComponent,
      'instance',
    );

    expect(isClient).toBe(true);
    expect(config).toEqual(pattern);
  });
});
