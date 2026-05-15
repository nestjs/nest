import { Test, TestingModule } from '@nestjs/testing';
import { AppModule, dynamicModule } from '../../src/app.module.js';
import { AppService } from '../../src/app.service.js';

describe('Application Context (e2e)', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('AppService', () => {
    it('should resolve AppService from the container', () => {
      const appService = module.get(AppService);
      expect(appService).toBeDefined();
    });

    it('should return the hello message', () => {
      const appService = module.get(AppService);
      expect(appService.getHello()).toBe('Hello world!');
    });
  });

  describe('MyDynamicModule', () => {
    it('should resolve MyDynamicProvider with the registered value', () => {
      const value = module.select(dynamicModule).get('MyDynamicProvider');
      expect(value).toBe('foobar');
    });
  });
});
