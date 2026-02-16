import { Test } from '@nestjs/testing';
import { DefaultsModule } from '../src/defaults/defaults.module.js';
import { DefaultsService } from '../src/defaults/defaults.service.js';

describe('Injector', () => {
  describe('when optional', () => {
    it(`should make use of default assignments`, async () => {
      const builder = Test.createTestingModule({
        imports: [DefaultsModule],
      });
      const app = await builder.compile();
      expect(app.get(DefaultsService).coreService.default).toBe(true);
    });
  });
});
