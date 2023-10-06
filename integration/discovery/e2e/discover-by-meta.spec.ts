import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from '@nestjs/core';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';
import { WebhooksExplorer } from '../src/webhooks.explorer';
import { NonAppliedDecorator } from '../src/decorators/non-applied.decorator';

describe('DiscoveryModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should discover all providers & handlers with corresponding annotations', async () => {
    const webhooksExplorer = moduleRef.get(WebhooksExplorer);

    expect(webhooksExplorer.getWebhooks()).to.be.eql([
      {
        handlers: [
          {
            event: 'start',
            methodName: 'onStart',
          },
        ],
        name: 'cleanup',
      },
      {
        handlers: [
          {
            event: 'start',
            methodName: 'onStart',
          },
        ],
        name: 'flush',
      },
    ]);
  });

  it('should return an empty array if no providers were found for a given discoverable decorator', () => {
    const discoveryService = moduleRef.get(DiscoveryService);

    const providers = discoveryService.getProviders({
      metadataKey: NonAppliedDecorator.KEY,
    });
    expect(providers).to.be.eql([]);
  });

  it('should return an empty array if no controllers were found for a given discoverable decorator', () => {
    const discoveryService = moduleRef.get(DiscoveryService);

    const controllers = discoveryService.getControllers({
      metadataKey: NonAppliedDecorator.KEY,
    });
    expect(controllers).to.be.eql([]);
  });
});
