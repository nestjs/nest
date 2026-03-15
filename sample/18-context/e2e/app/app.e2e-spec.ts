import { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule, dynamicModule } from '../../src/app.module';
import { AppService } from '../../src/app.service';

describe('Context (e2e)', () => {
  let app: INestApplicationContext;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should resolve AppService from the application context', () => {
    const appService = app.get(AppService);
    expect(appService).toBeDefined();
    expect(appService.getHello()).toBe('Hello world!');
  });

  it('should resolve dynamic provider from the dynamic module', () => {
    const myDynamicProviderValue = app
      .select(dynamicModule)
      .get('MyDynamicProvider');
    expect(myDynamicProviderValue).toBe('foobar');
  });
});
