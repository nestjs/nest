import {
  DynamicModule,
  forwardRef,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const AUTH_VALUE = 'unauthorized';
const DASHBOARD_VALUE = 'dashboard';

let registerCalls = 0;
let serviceInstances = 0;

@Injectable()
class DashboardService {
  constructor() {
    serviceInstances++;
  }
}

@Module({})
class DashboardModule {
  static register(): DynamicModule {
    registerCalls++;
    return {
      module: DashboardModule,
      providers: [DashboardService],
      exports: [DashboardService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    // Answers the requests itself, behind the authentication of the parent
    consumer
      .apply((req, res, next) => res.end(DASHBOARD_VALUE))
      .forRoutes('dashboard');
  }
}

@Module({ providers: [DashboardService] })
class ReportsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(DASHBOARD_VALUE))
      .forRoutes('dashboard');
  }
}

@Module({})
class FeatureModule {
  static register(): DynamicModule {
    return {
      module: FeatureModule,
      imports: [forwardRef(() => ReportsModule)],
    };
  }
}

const countModules = (app: INestApplication, metatype: unknown) =>
  [...app.get(ModulesContainer).values()].filter(
    moduleRef => moduleRef.metatype === metatype,
  ).length;

describe('Middleware - modules imported through forwardRef()', () => {
  let app: INestApplication;

  const createApp = async (imports: any[]) => {
    @Module({ imports })
    class AppModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => res.end(AUTH_VALUE))
          .forRoutes('{*path}');
      }
    }

    app = (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    await listenOnLoopback(app);
  };

  beforeEach(() => {
    registerCalls = 0;
    serviceInstances = 0;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should register a dynamic module given as forwardRef() once, below its importer', async () => {
    await createApp([forwardRef(() => DashboardModule.register())]);

    expect(registerCalls).toBe(1);
    expect(countModules(app, DashboardModule)).toBe(1);
    await request(app.getHttpServer())
      .get('/dashboard')
      .expect(200, AUTH_VALUE);
  });

  it('should register a module given as forwardRef() in the imports of a dynamic module once', async () => {
    await createApp([FeatureModule.register()]);

    expect(countModules(app, ReportsModule)).toBe(1);
    expect(serviceInstances).toBe(1);
    await request(app.getHttpServer())
      .get('/dashboard')
      .expect(200, AUTH_VALUE);
  });
});
