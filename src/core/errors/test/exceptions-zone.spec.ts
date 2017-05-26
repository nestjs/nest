import * as sinon from 'sinon';
import { expect } from 'chai';
import { ExceptionsZone } from '../exceptions-zone';
import { UNHANDLED_RUNTIME_EXCEPTION } from '../messages';

describe('ExceptionsZone', () => {
    describe('run', () => {
        let callback: sinon.SinonSpy;
        beforeEach(() => {
            callback = sinon.spy();
        });
        it('should call callback', () => {
            ExceptionsZone.run(callback as any);
            expect(callback.called).to.be.true;
        });
        describe('when callback throws exception', () => {
            const exceptionHandler = {
                handle: () => {},
            };
            let handleSpy: sinon.SinonSpy;
            beforeEach(() => {
                (ExceptionsZone as any).exceptionHandler = exceptionHandler;
                handleSpy = sinon.spy(exceptionHandler, 'handle');
            });
            it('should call "handle" method of exceptionHandler and throws UNHANDLED_RUNTIME_EXCEPTION', () => {
                const throwsCallback = () => {
                    throw 3;
                };
                expect(() => ExceptionsZone.run(throwsCallback)).to.throws(UNHANDLED_RUNTIME_EXCEPTION);
                expect(handleSpy.called).to.be.true;
            });
        });
    });
});