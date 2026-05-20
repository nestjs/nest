import { expect } from 'chai';
import { UnknownDependenciesException } from '../../../errors/exceptions/unknown-dependencies.exception';
import {
  INVALID_MODULE_MESSAGE,
  UNDEFINED_MODULE_MESSAGE,
  UNKNOWN_EXPORT_MESSAGE,
  USING_INVALID_CLASS_AS_A_MODULE_MESSAGE,
} from '../../../errors/messages';
import { Module } from '../../../injector/module';
import { stringCleaner } from '../../utils/string.cleaner';

describe('Error Messages', () => {
  const CatsModule = { name: 'CatsModule' };
  const AppModule = { name: 'AppModule' };

  describe('UNKNOWN_DEPENDENCIES_MESSAGE', () => {
    const index = 0;
    it('should display class', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatService (?, CatService). Please make sure that the argument at index [0] is available in the current module.

      Potential solutions:
      - If dependency is a provider, is it part of the current Module?
      - If dependency is exported from a separate @Module, is that module imported within Module?
      @Module({
        imports: [ /* the Module containing dependency */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      class CatService {}

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index,
          dependencies: ['', CatService],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the provide token', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatService (?, MY_TOKEN). Please make sure that the argument at index [0] is available in the current module.

      Potential solutions:
      - If dependency is a provider, is it part of the current Module?
      - If dependency is exported from a separate @Module, is that module imported within Module?
      @Module({
      imports: [ /* the Module containing dependency */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index,
          dependencies: ['', 'MY_TOKEN'],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the provide token as double-quoted string for string-based tokens', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatService (?). Please make sure that the argument "FooRepository" at index [0] is available in the current module.

      Potential solutions:
      - If "FooRepository" is a provider, is it part of the current Module?
      - If "FooRepository" is exported from a separate @Module, is that module imported within Module?
      @Module({
      imports: [ /* the Module containing "FooRepository" */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index: 0,
          dependencies: ['FooRepository'],
          name: 'FooRepository',
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the function name', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatService (?, CatFunction). Please make sure that the argument at index [0] is available in the current module.

      Potential solutions:
      - If dependency is a provider, is it part of the current Module?
      - If dependency is exported from a separate @Module, is that module imported within Module?
      @Module({
        imports: [ /* the Module containing dependency */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      function CatFunction() {}
      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index,
          dependencies: ['', CatFunction],
        }).message,
      );
      expect(actualMessage).to.equal(expectedResult);
    });
    it('should use "+" if unknown dependency name', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatService (?, +). Please make sure that the argument at index [0] is available in the current module.

      Potential solutions:
      - If dependency is a provider, is it part of the current Module?
      - If dependency is exported from a separate @Module, is that module imported within Module?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index,
          dependencies: ['', undefined!],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the module name', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatService (?, MY_TOKEN). Please make sure that the argument at index [0] is available in the TestModule module.

      Potential solutions:
      - Is TestModule a valid NestJS module?
      - If dependency is a provider, is it part of the current TestModule?
      - If dependency is exported from a separate @Module, is that module imported within TestModule?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      class MetaType {
        name: string;
      }
      class TestModule {
        metatype: MetaType;
      }
      const myModule = new TestModule();
      const myMetaType = new MetaType();
      myMetaType.name = 'TestModule';
      myModule.metatype = myMetaType;

      const actualMessage = stringCleaner(
        new UnknownDependenciesException(
          'CatService',
          { index, dependencies: ['', 'MY_TOKEN'] },
          myModule as Module,
        ).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the symbol name of the provider', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the Symbol(CatProvider) (?). Please make sure that the argument at index [0] is available in the current module.

      Potential solutions:
      - If dependency is a provider, is it part of the current Module?
      - If dependency is exported from a separate @Module, is that module imported within Module?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException(Symbol('CatProvider'), {
          index,
          dependencies: [''],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the symbol dependency of the provider', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the CatProvider (?, Symbol(DogProvider)). Please make sure that the argument at index [0] is available in the current module.

      Potential solutions:
      - If dependency is a provider, is it part of the current Module?
      - If dependency is exported from a separate @Module, is that module imported within Module?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatProvider', {
          index,
          dependencies: ['', Symbol('DogProvider')],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should detect likely import type issue and provide specific guidance', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the ResourceController (ResourceService, ?). Please make sure that the argument at index [1] is available in the current module.

      Potential solutions:
      - The dependency at index [1] appears to be undefined at runtime
      - This commonly occurs when using 'import type' instead of 'import' for injectable classes
      - Check your imports and change:
        ❌ import type { SomeService } from './some.service';
        ✅ import { SomeService } from './some.service';
      - Ensure the imported class is decorated with @Injectable() or is a valid provider
      - If using dynamic imports, ensure the class is available at runtime, not just for type checking

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('ResourceController', {
          index: 1,
          dependencies: ['ResourceService', Object], // Object simulates import type issue
          name: 'SomeService',
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should detect import type issue with mixed dependencies', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the ResourceController (ValidService, ?, AnotherService). Please make sure that the argument at index [1] is available in the current module.

      Potential solutions:
      - The dependency at index [1] appears to be undefined at runtime
      - This commonly occurs when using 'import type' instead of 'import' for injectable classes
      - Check your imports and change:
        ❌ import type { SomeService } from './some.service';
        ✅ import { SomeService } from './some.service';
      - Ensure the imported class is decorated with @Injectable() or is a valid provider
      - If using dynamic imports, ensure the class is available at runtime, not just for type checking

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      class ValidService {}
      class AnotherService {}

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('ResourceController', {
          index: 1,
          dependencies: [ValidService, Object, AnotherService], // mixed valid/Object
          name: 'SomeService',
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display class token name in argument label when name is provided', () => {
      class UserRepository {}

      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the UserService (?). Please make sure that the argument UserRepository at index [0] is available in the current module.

      Potential solutions:
      - If UserRepository is a provider, is it part of the current Module?
      - If UserRepository is exported from a separate @Module, is that module imported within Module?
      @Module({
        imports: [ /* the Module containing UserRepository */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('UserService', {
          index: 0,
          dependencies: [UserRepository],
          name: UserRepository,
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display string token name in argument label when name is provided', () => {
      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the UserService (?). Please make sure that the argument "DATABASE_URL" at index [0] is available in the current module.

      Potential solutions:
      - If "DATABASE_URL" is a provider, is it part of the current Module?
      - If "DATABASE_URL" is exported from a separate @Module, is that module imported within Module?
      @Module({
        imports: [ /* the Module containing "DATABASE_URL" */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('UserService', {
          index: 0,
          dependencies: ['DATABASE_URL'],
          name: 'DATABASE_URL',
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display symbol token name in argument label when name is provided', () => {
      const TOKEN = Symbol('MY_TOKEN');

      const expectedResult =
        stringCleaner(`Nest can't resolve dependencies of the UserService (?). Please make sure that the argument Symbol(MY_TOKEN) at index [0] is available in the current module.

      Potential solutions:
      - If Symbol(MY_TOKEN) is a provider, is it part of the current Module?
      - If Symbol(MY_TOKEN) is exported from a separate @Module, is that module imported within Module?
      @Module({
        imports: [ /* the Module containing Symbol(MY_TOKEN) */ ]
      })

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('UserService', {
          index: 0,
          dependencies: [TOKEN],
          name: TOKEN,
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should add documentation links to export errors', () => {
      const expectedResult =
        stringCleaner(`Nest cannot export a provider/module that is not a part of the currently processed module (TestModule). Please verify whether the exported TestService is available in this particular context.

      Possible Solutions:
      - Is TestService part of the relevant providers/imports within TestModule?

      For more common dependency resolution issues, see: https://docs.nestjs.com/faq/common-errors
      `);

      const actualMessage = stringCleaner(
        UNKNOWN_EXPORT_MESSAGE('TestService', 'TestModule'),
      );

      expect(actualMessage).to.equal(expectedResult);
    });
  });

  describe('UNDEFINED_MODULE_EXCEPTION', () => {
    it('should display the module name with the undefined index and scope', () => {
      const expectedMessage =
        stringCleaner(`Nest cannot create the CatsModule instance.
The module at index [0] of the CatsModule "imports" array is undefined.

Potential causes:
- A circular dependency between modules. Use forwardRef() to avoid it. Read more: https://docs.nestjs.com/fundamentals/circular-dependency
- The module at index [0] is of type "undefined". Check your import statements and the type of the module.

Scope [AppModule -> CatsModule]`);

      const actualMessage = stringCleaner(
        UNDEFINED_MODULE_MESSAGE(CatsModule, 0, [AppModule, CatsModule]),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });
  });

  describe('INVALID_MODULE_MESSAGE', () => {
    it('should display the received `null` value and its type', () => {
      const expectedMessage =
        stringCleaner(`Nest cannot create the CatsModule instance.
Received an unexpected value at index [0] of the CatsModule "imports" array.
The received value \`null\` is of type "null".

Scope [AppModule -> CatsModule]`);

      const actualMessage = stringCleaner(
        INVALID_MODULE_MESSAGE(CatsModule, 0, [AppModule, CatsModule], null),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });

    it('should display the received `false` value and its type', () => {
      const expectedMessage =
        stringCleaner(`Nest cannot create the CatsModule instance.
Received an unexpected value at index [0] of the CatsModule "imports" array.
The received value \`false\` is of type "boolean".

Scope [AppModule -> CatsModule]`);

      const actualMessage = stringCleaner(
        INVALID_MODULE_MESSAGE(CatsModule, 0, [AppModule, CatsModule], false),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });

    it('should display the received `0` value and its type', () => {
      const expectedMessage =
        stringCleaner(`Nest cannot create the CatsModule instance.
Received an unexpected value at index [0] of the CatsModule "imports" array.
The received value \`0\` is of type "number".

Scope [AppModule -> CatsModule]`);

      const actualMessage = stringCleaner(
        INVALID_MODULE_MESSAGE(CatsModule, 0, [AppModule, CatsModule], 0),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });

    it('should display the received empty string value and its type', () => {
      const expectedMessage =
        stringCleaner(`Nest cannot create the CatsModule instance.
Received an unexpected value at index [0] of the CatsModule "imports" array.
The received value \`""\` is of type "string".

Scope [AppModule -> CatsModule]`);

      const actualMessage = stringCleaner(
        INVALID_MODULE_MESSAGE(CatsModule, 0, [AppModule, CatsModule], ''),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });
  });

  describe('USING_INVALID_CLASS_AS_A_MODULE_MESSAGE', () => {
    class FooClass {}

    it('should identify a class decorated with @Controller() and direct it to the "controllers" array', () => {
      const expectedMessage =
        stringCleaner(`"FooClass" is decorated with @Controller() and cannot appear in the "imports" array of a module. Please move "FooClass" to the "controllers" array of the importing module instead.

Scope [AppModule]`);

      const actualMessage = stringCleaner(
        USING_INVALID_CLASS_AS_A_MODULE_MESSAGE(
          FooClass,
          [AppModule],
          'controller',
        ),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });

    it('should identify a class decorated with @Injectable() and direct it to the "providers" array', () => {
      const expectedMessage =
        stringCleaner(`"FooClass" is decorated with @Injectable() and cannot appear in the "imports" array of a module. Please move "FooClass" to the "providers" array of the importing module instead.

Scope [AppModule]`);

      const actualMessage = stringCleaner(
        USING_INVALID_CLASS_AS_A_MODULE_MESSAGE(
          FooClass,
          [AppModule],
          'provider',
        ),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });

    it('should identify a class decorated with @Catch() and direct it to the "providers" array or @UseFilters()', () => {
      const expectedMessage =
        stringCleaner(`"FooClass" is decorated with @Catch() and cannot appear in the "imports" array of a module. Please move "FooClass" to the "providers" array (using the APP_FILTER token to apply it globally) or apply it via @UseFilters() instead.

Scope [AppModule]`);

      const actualMessage = stringCleaner(
        USING_INVALID_CLASS_AS_A_MODULE_MESSAGE(
          FooClass,
          [AppModule],
          'filter',
        ),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });
  });
});
