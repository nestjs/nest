import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientTCP } from '../../client/client-tcp';

describe('ClientTCP', () => {
    const client = new ClientTCP({});

    describe('createCallback', () => {
        it(`should return function`, () => {
            expect(typeof client.createCallback(null)).to.be.eql('function');
        });
        describe('callback', () => {
            const callback: sinon.SinonSpy = sinon.spy();
            let fn;

            beforeEach(() => {
                fn = client.createCallback(callback);
            });
            it('should call callback with error when "err" is truthy', () => {
                const error = 'test';
                fn(error, null);
                expect(callback.calledWith(error)).to.be.true;
            });
            it('should call callback with response when "err" is not truthy', () => {
                const response = { err: 'test', response: 'restest' };
                fn(null, response);
                expect(callback.calledWith(response.err, response.response)).to.be.true;
            });
        });
    });
});