import {
  Controller,
  DynamicModule,
  INestApplication,
  Injectable,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

@Injectable()
class LoggerService {
  constructor(public readonly prefix: string) {}
}

class LoggerModule {
  static forRoot(prefix: string): DynamicModule {
    return {
      module: LoggerModule,
      global: true,
      providers: [
        {
          provide: LoggerService,
          useFactory: () => new LoggerService(prefix),
        },
      ],
      exports: [LoggerService],
    };
  }

  static forFeature(prefix: string): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useFactory: () => new LoggerService(prefix),
        },
      ],
      exports: [LoggerService],
    };
  }
}

@Injectable()
class CatService {
  constructor(public readonly logger: LoggerService) {}
}

@Controller('cats')
class CatController {
  constructor(
    public readonly logger: LoggerService,
    private readonly catService: CatService,
  ) {}

  findAll() {
    return [];
  }
}

@Module({
  imports: [LoggerModule.forFeature('Cat')],
  providers: [CatService],
  controllers: [CatController],
})
class CatModule {}

@Module({ imports: [LoggerModule.forRoot('App'), CatModule] })
class AppModule {}

@Module({ imports: [CatModule, LoggerModule.forRoot('App')] })
class AppModuleReversed {}

describe('forRoot / forFeature resolution', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve the same LoggerService instance for the controller and the service in a feature module that imports forFeature', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const controller = app.get(CatController);
    const service = app.get(CatService);

    expect(controller.logger).to.equal(service.logger);
  });

  it('should prefer the forFeature instance over the global forRoot instance for the same token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const controller = app.get(CatController);
    const service = app.get(CatService);

    expect(controller.logger.prefix).to.equal('Cat');
    expect(service.logger.prefix).to.equal('Cat');
  });

  describe('when the global forRoot is imported before the feature module', () => {
    it('should still resolve the forFeature instance for both consumers', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModuleReversed],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();

      const controller = app.get(CatController);
      const service = app.get(CatService);

      expect(controller.logger).to.equal(service.logger);
      expect(controller.logger.prefix).to.equal('Cat');
      expect(service.logger.prefix).to.equal('Cat');
    });
  });
});
