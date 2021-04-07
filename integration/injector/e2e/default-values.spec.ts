import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { DefaultsModule } from '../src/defaults/defaults.module';
import { DefaultsService } from '../src/defaults/defaults.service';

describe('Injector', () => {
  describe('when optional', () => {
    it(`should make use of default assignments`, async () => {
      const builder = Test.createTestingModule({
        imports: [DefaultsModule],
      });
      const app = await builder.compile();
      expect(app.get(DefaultsService).coreService.default).to.be.true;
    });
  });
});
