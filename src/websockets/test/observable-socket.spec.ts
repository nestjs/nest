import * as sinon from 'sinon';
import { expect } from 'chai';
import { ObservableSocket } from '../observable-socket';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';

describe('ObservableSocket', () => {
    describe('create', () => {
        it(`should return expected observable socket object`, () => {
            const server = { test: 'test' };
            const result = ObservableSocket.create(server);

            expect(result).to.have.keys('init', 'connection', 'disconnect', 'server');
            expect(result.init instanceof ReplaySubject).to.be.true;
            expect(result.connection instanceof Subject).to.be.true;
            expect(result.disconnect instanceof Subject).to.be.true;
            expect(result.server).to.be.eql(server);
        });
    });
});