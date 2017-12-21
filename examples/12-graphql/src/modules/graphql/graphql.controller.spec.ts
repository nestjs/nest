import { Test } from '@nestjs/testing';
import { TestingModule } from '@nestjs/testing/testing-module';
import { GraphqlController } from './graphql.controller';
import { expect } from 'chai';

describe('GraphqlController', () => {
  let module: TestingModule;
  beforeEach(() => {
    return Test.createTestingModule({
      controllers: [
        GraphqlController
      ]
    }).compile()
      .then(compiledModule => module = compiledModule);
  });

  let controller: GraphqlController;
  beforeEach(() => {
    controller = module.get(GraphqlController);
  });

  it('should exist', () => {
    expect(controller).to.exist;
  });
});
