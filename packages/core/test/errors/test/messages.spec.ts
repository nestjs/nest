import { expect } from 'chai';
import { UnknownDependenciesException } from '../../../errors/exceptions/unknown-dependencies.exception';
import { Module } from '../../../injector/module';
import { stringCleaner } from '../../utils/string.cleaner';
import {
  UNDEFINED_MODULE_MESSAGE,
  INVALID_MODULE_MESSAGE,
} from '../../../errors/messages';

describe('Error Messages', () => {
  const CatsModule = { name: 'CatsModule' };
  const AppModule = { name: 'AppModule' };

  describe('UNKNOWN_DEPENDENCIES_MESSAGE', () => {
    const index = 0;
    it('should display class', () => {
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the CatService (?, CatService). Please make sure that the argument dependency at index [0] is available in the current context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current current?
      - If dependency is exported from a separate @Module, is that module imported within current?
      @Module({
        imports: [ /* the Module containing dependency */ ]
      })
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
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the CatService (?, MY_TOKEN). Please make sure that the argument dependency at index [0] is available in the current context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current current?
      - If dependency is exported from a separate @Module, is that module imported within current?
      @Module({
      imports: [ /* the Module containing dependency */ ]
      })
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index,
          dependencies: ['', 'MY_TOKEN'],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the function name', () => {
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the CatService (?, CatFunction). Please make sure that the argument dependency at index [0] is available in the current context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current current?
      - If dependency is exported from a separate @Module, is that module imported within current?
      @Module({
        imports: [ /* the Module containing dependency */ ]
      })
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
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the CatService (?, +). Please make sure that the argument dependency at index [0] is available in the current context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current current?
      - If dependency is exported from a separate @Module, is that module imported within current?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatService', {
          index,
          dependencies: ['', undefined],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
    it('should display the module name', () => {
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the CatService (?, MY_TOKEN). Please make sure that the argument dependency at index [0] is available in the TestModule context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current TestModule?
      - If dependency is exported from a separate @Module, is that module imported within TestModule?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })
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
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the Symbol(CatProvider) (?). Please make sure that the argument dependency at index [0] is available in the current context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current current?
      - If dependency is exported from a separate @Module, is that module imported within current?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })
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
      const expectedResult = stringCleaner(`Nest can't resolve dependencies of the CatProvider (?, Symbol(DogProvider)). Please make sure that the argument dependency at index [0] is available in the current context.
  
      Potential solutions:
      - If dependency is a provider, is it part of the current current?
      - If dependency is exported from a separate @Module, is that module imported within current?
        @Module({
          imports: [ /* the Module containing dependency */ ]
        })
      `);

      const actualMessage = stringCleaner(
        new UnknownDependenciesException('CatProvider', {
          index,
          dependencies: ['', Symbol('DogProvider')],
        }).message,
      );

      expect(actualMessage).to.equal(expectedResult);
    });
  });

  describe('UNDEFINED_MODULE_EXCEPTION', () => {
    it('should display the module name with the undefined index and scope', () => {
      const expectedMessage = stringCleaner(`Nest cannot create the CatsModule instance.
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
    it('should display the module name with the invalid index and scope', () => {
      const expectedMessage = stringCleaner(`Nest cannot create the CatsModule instance.
Received an unexpected value at index [0] of the CatsModule "imports" array. 

Scope [AppModule -> CatsModule]`);

      const actualMessage = stringCleaner(
        INVALID_MODULE_MESSAGE(CatsModule, 0, [AppModule, CatsModule]),
      );

      expect(actualMessage).to.be.eq(expectedMessage);
    });
  });
});
