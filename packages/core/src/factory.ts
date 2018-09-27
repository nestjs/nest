import { Scanner, NestContainer, NestModule, InjectionToken } from './module';
import { APP_INIT, APP_DESTROY } from './tokens';
import { ExceptionsZone, MissingInjectionTokenException } from './errors';
import { Registry } from './registry';
import { Type } from './interfaces';
import { Utils } from './util';

// @TODO: Figure out why <https://github.com/inversify/InversifyJS/blob/master/wiki/hierarchical_di.md> doesn't work
export class NestFactory {
  public readonly container = new NestContainer();
  public readonly scanner = new Scanner(this.container);

  constructor(private readonly module: Type<NestModule>) {}

  public async start() {
    await ExceptionsZone.run(async () => {
      await this.scanner.scan(this.module);
      await this.init();
    });
  }

  public async destroy() {
    await ExceptionsZone.run(async () => {
      await Utils.series(this.container.getAllProviders(APP_DESTROY));
    });
  }

  private async init() {
    await Utils.series(this.container.getAllProviders(APP_INIT));
  }

  public select(module: Type<NestModule>) {
    return {
      get: <T>(provider: Type<T> | InjectionToken<T>) => {
        return this.container.getProvider<T>(provider, module, {
          strict: true,
        });
      },
      getAll: <T>(token: InjectionToken<T>) => {
        if (!Registry.isInjectionToken(token)) {
          throw new MissingInjectionTokenException(
            'NestFactory.select().getAll()',
          );
        }

        return this.container.getAllProviders(token, module);
      },
      has: (provider: Type<T> | InjectionToken<T>) =>
        this.container.isProviderBound(provider, module),
    };
  }

  public has<T>(provider: Type<T> | InjectionToken<T>) {
    return this.container.isProviderBound<T>(provider);
  }

  public getAll<T>(token: InjectionToken<T>) {
    if (!Registry.isInjectionToken(token)) {
      throw new MissingInjectionTokenException('NestFactory.getAll()');
    }

    return this.container.getAllProviders<T>(token);
  }

  public get<T>(provider: Type<T> | InjectionToken<T>) {
    return this.container.getProvider<T>(provider);
  }
}
