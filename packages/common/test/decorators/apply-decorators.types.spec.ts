import {
  GUARDS_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '../../constants.js';
import {
  applyDecorators,
  Controller,
  Get,
  Inject,
  SetMetadata,
  UseGuards,
} from '../../index.js';

describe('applyDecorators public types', () => {
  it('should compose metadata and guards on a controller and its handler', () => {
    class Guard {
      canActivate() {
        return true;
      }
    }

    const Auth = (...roles: string[]) =>
      applyDecorators(SetMetadata('roles', roles), UseGuards(Guard));

    @Controller()
    @Auth('admin')
    class AppController {
      @Get()
      @Auth('reader')
      findAll(): void {}
    }

    expect(Reflect.getMetadata('roles', AppController)).toEqual(['admin']);
    expect(Reflect.getMetadata(GUARDS_METADATA, AppController)).toEqual([
      Guard,
    ]);
    expect(
      Reflect.getMetadata('roles', AppController.prototype.findAll),
    ).toEqual(['reader']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AppController.prototype.findAll),
    ).toEqual([Guard]);
  });

  it('should compose a parameter decorator', () => {
    const InjectConfig = () => applyDecorators(Inject('CONFIG'));

    class Service {
      constructor(@InjectConfig() public config: unknown) {}
    }

    expect(Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, Service)).toEqual([
      { index: 0, param: 'CONFIG' },
    ]);
  });
});
