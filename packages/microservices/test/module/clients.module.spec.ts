import { DynamicModule } from '@nestjs/common';
import { expect } from 'chai';
import { ClientProxyFactory } from '../../client';
import { ClientsModule } from '../../module';

describe('ClientsModule', () => {
  let dynamicModule: DynamicModule;
  beforeEach(() => {
    dynamicModule = ClientsModule.register([
      {
        name: 'test',
        options: {},
      },
    ]);
  });
  it('should return an expected module ref', () => {
    expect(dynamicModule.module).to.be.eql(ClientsModule);
  });
  it('should return an expected providers array', () => {
    expect(dynamicModule.providers).to.be.deep.eq([
      {
        provide: 'test',
        useValue: ClientProxyFactory.create({}),
      },
    ]);
  });
});
