import { expect } from 'chai';
import { UnknownDependenciesException } from '../../../errors/exceptions/unknown-dependencies.exception';
import { Module } from '../../../injector/module';

describe('UnknownDependenciesMessage', () => {
  const index = 0;
  it('should display class', () => {
    class CatService { }
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, CatService). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', CatService] }).message).to.equal(expectedResult);
  });
  it('should display the provide token', () => {
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, MY_TOKEN). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', 'MY_TOKEN'] }).message).to.equal(expectedResult);
  });
  it('should display the function name', () => {
    function CatFunction() { }
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, CatFunction). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', CatFunction] }).message).to.equal(expectedResult);
  });
  it('should use "+" if unknown dependency name', () => {
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, +). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', undefined] }).message).to.equal(expectedResult);
  });
  it('should display the module name', () => {
    const expectedResult =
      'Nest can\'t resolve dependencies of the CatService (?, MY_TOKEN). ' +
      'Please make sure that the argument at index [0] is available in the TestModule context.';
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
    expect(new UnknownDependenciesException('CatService', { index, dependencies: ['', 'MY_TOKEN'] }, myModule as Module).message).to.equal(expectedResult);
  });
  it('should display the symbol name of the provider', () => {
    const expectedResult = 'Nest can\'t resolve dependencies of the Symbol(CatProvider) (?). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException(Symbol('CatProvider'), { index, dependencies: [''] }).message).to.equal(expectedResult);
  });
  it('should display the symbol dependency of the provider', () => {
    const expectedResult = 'Nest can\'t resolve dependencies of the CatProvider (?, Symbol(DogProvider)). ' +
      'Please make sure that the argument at index [0] is available in the current context.';
    expect(new UnknownDependenciesException('CatProvider', { index, dependencies: ['', Symbol('DogProvider')] }).message).to.equal(expectedResult);
  });
});
