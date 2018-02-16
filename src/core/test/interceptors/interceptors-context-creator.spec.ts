import * as sinon from 'sinon';
import { expect } from 'chai';
import { Observable } from 'rxjs/Observable';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { of } from 'rxjs/observable/of';

describe('InterceptorsContextCreator', () => {
  let interceptorsContextCreator: InterceptorsContextCreator;
  let interceptors: any[];
  let container;
  let getSpy;

  beforeEach(() => {
    interceptors = [
      {
        name: 'test',
        instance: {
          intercept: () => of(true),
        },
      },
      {
        name: 'test2',
        instance: {
          intercept: () => of(true),
        },
      },
      {},
      undefined,
    ];
    getSpy = sinon.stub().returns({
      injectables: new Map([
        ['test', interceptors[0]],
        ['test2', interceptors[1]],
      ]),
    });
    container = {
      getModules: () => ({
        get: getSpy,
      }),
    };
    interceptorsContextCreator = new InterceptorsContextCreator(
      container as any,
    );
  });
  describe('createConcreteContext', () => {
    describe('when `moduleContext` is nil', () => {
      it('should returns empty array', () => {
        const result = interceptorsContextCreator.createConcreteContext(
          interceptors,
        );
        expect(result).to.be.empty;
      });
    });
    describe('when `moduleContext` is defined', () => {
      beforeEach(() => {
        // tslint:disable-next-line:no-string-literal
        interceptorsContextCreator['moduleContext'] = 'test';
      });
      it('should filter metatypes', () => {
        expect(
          interceptorsContextCreator.createConcreteContext(interceptors),
        ).to.have.length(2);
      });
    });
  });
});
