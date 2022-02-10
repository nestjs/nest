import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { IntegrationModule } from '../src/integration.module';

describe('Module utils (ConfigurableModuleBuilder)', () => {
  it('should auto-generate "forRoot" method', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        IntegrationModule.forRoot({
          isGlobal: true,
          url: 'test_url',
          secure: false,
        }),
      ],
    }).compile();

    const integrationModule = moduleRef.get(IntegrationModule);

    expect(integrationModule.options).to.deep.equal({
      url: 'test_url',
      secure: false,
    });
  });

  it('should auto-generate "forRootAsync" method', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        IntegrationModule.forRootAsync({
          isGlobal: true,
          useFactory: () => {
            return {
              url: 'test_url',
              secure: false,
            };
          },
        }),
      ],
    }).compile();

    const integrationModule = moduleRef.get(IntegrationModule);

    expect(integrationModule.options).to.deep.equal({
      url: 'test_url',
      secure: false,
    });
  });
});
