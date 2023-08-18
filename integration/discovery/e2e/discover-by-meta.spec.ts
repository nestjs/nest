import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';
import { WebhooksExplorer } from '../src/webhooks.explorer';

describe('DiscoveryModule', () => {
  it('should discover all providers & handlers with corresponding annotations', async () => {
    const builder = Test.createTestingModule({
      imports: [AppModule],
    });
    const testingModule = await builder.compile();
    const webhooksExplorer = testingModule.get(WebhooksExplorer);

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
});
