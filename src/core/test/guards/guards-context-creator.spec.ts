import {expect} from 'chai';
import {Observable} from 'rxjs/Observable';
import * as sinon from 'sinon';

import {GuardsContextCreator} from '../../guards/guards-context-creator';

describe('GuardsContextCreator', () => {
  let guardsContextCreator: GuardsContextCreator;
  let guards: any[];
  let container;
  let getSpy;

  beforeEach(() => {
    guards = [
      {
        name : 'test',
        instance : {
          canActivate : () => true,
        },
      },
      {
        name : 'test2',
        instance : {
          canActivate : () => true,
        },
      },
      {},
      undefined,
    ];
    getSpy = sinon.stub().returns({
      injectables : new Map([
        [ 'test', guards[0] ],
        [ 'test2', guards[1] ],
      ]),
    });
    container = {
      getModules : () => ({
        get : getSpy,
      }),
    };
    guardsContextCreator = new GuardsContextCreator(container as any);
  });
  describe('createConcreteContext', () => {
    describe('when `moduleContext` is nil', () => {
      it('should returns empty array', () => {
        const result = guardsContextCreator.createConcreteContext(guards);
        expect(result).to.be.empty;
      });
    });
    describe('when `moduleContext` is defined', () => {
      beforeEach(() => {
        // tslint:disable-next-line:no-string-literal
        guardsContextCreator['moduleContext'] = 'test';
      });
      it('should filter metatypes', () => {
        expect(
            guardsContextCreator.createConcreteContext(guards),
            )
            .to.have.length(2);
      });
    });
  });
});