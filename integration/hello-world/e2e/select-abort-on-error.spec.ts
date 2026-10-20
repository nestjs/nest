import { Injectable, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { UnknownElementException } from '@nestjs/core/errors/exceptions/unknown-element.exception.js';
import { UnknownModuleException } from '@nestjs/core/errors/exceptions/unknown-module.exception.js';

@Injectable()
class FeatureService {}

@Module({ providers: [FeatureService] })
class FeatureModule {}

@Module({ imports: [FeatureModule] })
class AppModule {}

@Module({})
class NotImportedModule {}

describe('select() with abortOnError', () => {
  let app: INestApplication;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as () => never);
  });

  afterEach(async () => {
    exit.mockRestore();
    await app.close();
  });

  it('should throw instead of exiting when abortOnError is false', async () => {
    app = await NestFactory.create(AppModule, { logger: false });

    expect(() =>
      app.select(NotImportedModule, { abortOnError: false }),
    ).toThrow(UnknownModuleException);
    expect(exit).not.toHaveBeenCalled();
  });

  it('should exit when the selected context has abortOnError set to true', async () => {
    app = await NestFactory.create(AppModule, {
      abortOnError: false,
      logger: false,
    });

    app.select(FeatureModule, { abortOnError: true }).get('missing');

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should exit when select itself fails with abortOnError set to true', async () => {
    app = await NestFactory.create(AppModule, {
      abortOnError: false,
      logger: false,
    });

    expect(() =>
      app.select(NotImportedModule, { abortOnError: true }),
    ).not.toThrow();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should apply the option of the selected context to a further select', async () => {
    app = await NestFactory.create(AppModule, {
      abortOnError: false,
      logger: false,
    });

    app
      .select(FeatureModule, { abortOnError: true })
      .select(FeatureModule)
      .get('missing');

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should let a further select override the option of the selected context', async () => {
    app = await NestFactory.create(AppModule, { logger: false });

    expect(() =>
      app
        .select(FeatureModule, { abortOnError: true })
        .select(FeatureModule, { abortOnError: false })
        .get('missing'),
    ).toThrow(UnknownElementException);
    expect(exit).not.toHaveBeenCalled();
  });

  it('should return the selected context as before when select has no abortOnError', async () => {
    app = await NestFactory.create(AppModule, { logger: false });

    expect(() => app.select(FeatureModule).get('missing')).toThrow(
      UnknownElementException,
    );
    expect(exit).not.toHaveBeenCalled();
  });
});
