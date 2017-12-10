import 'rxjs/add/observable/of';

import * as sinon from 'sinon';

import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { Observable } from 'rxjs/Observable';
import { expect } from 'chai';

describe('InterceptorsContextCreator', () => {
    let interceptorsContextCreator: InterceptorsContextCreator;
    let interceptors: any[];
    let container: any;
    let getSpy: any;

    beforeEach(() => {
        interceptors = [
            {
                name: 'test',
                instance: {
                    intercept: () => Observable.of(true),
                },
            },
            {
                name: 'test2',
                instance: {
                    intercept: () => Observable.of(true),
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
        interceptorsContextCreator = new InterceptorsContextCreator(container as any);
    });
    describe('createConcreteContext', () => {
        describe('when `moduleContext` is nil', () => {
            it('should returns empty array', () => {
                const result = interceptorsContextCreator.createConcreteContext(interceptors);
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
