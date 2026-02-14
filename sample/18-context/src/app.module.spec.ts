import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppService } from './app.service';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide AppService', () => {
    const appService = module.get<AppService>(AppService);
    expect(appService).toBeDefined();
    expect(appService).toBeInstanceOf(AppService);
  });

  it('should provide MyDynamicProvider with value "foobar"', () => {
    const provider = module.get('MyDynamicProvider');
    expect(provider).toBe('foobar');
  });

  it('should allow AppService to work correctly', () => {
    const appService = module.get<AppService>(AppService);
    expect(appService.getHello()).toBe('Hello world!');
  });
});
