import { expect } from 'chai';
import { Server } from '../../server/server';

class TestServer extends Server {
    public listen(callback: () => void) {}
}

describe('Server', () => {
    const server = new TestServer();
    const callback = () => {},
        pattern = { test: 'test' };

    describe('add', () => {
        it(`should add handler as a stringified pattern key`, () => {
            server.add(pattern, callback);

            const handlers = server.getHandlers();
            expect(handlers[JSON.stringify(pattern)]).to.equal(callback);
        });
    });
});