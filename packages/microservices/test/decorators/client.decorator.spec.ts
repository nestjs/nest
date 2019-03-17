import 'mocha';
import { expect } from 'chai';
import {
  CLIENT_METADATA,
  CLIENT_CONFIGURATION_METADATA,
} from '../../constants';
import { Client } from '../../decorators/client.decorator';

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

    expect(isClient).to.be.true;
    expect(config).to.be.eql(pattern);
  });
});
