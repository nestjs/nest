// NOTE: This tests nothing, it's just to show how to mock an ESM package
import { jest } from '@jest/globals';

// We will test the mocking feature from Jest to mock the `superjson` package for testing purposes
// We must call this before loading the module!
jest.unstable_mockModule('superjson', () => ({
  stringify: () => 'noop',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { superJSONProvider } from './superjson.provider';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [superJSONProvider, AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the stub object', () => {
      expect(appController.getHello()).toEqual({
        jsonString: 'noop',
      });
    });
  });
});
