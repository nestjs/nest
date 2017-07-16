"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const listeners_controller_1 = require("../listeners-controller");
const listener_metadata_explorer_1 = require("../listener-metadata-explorer");
const metadata_scanner_1 = require("../../core/metadata-scanner");
const container_1 = require("../container");
describe('ListenersController', () => {
    let instance, explorer, metadataExplorer, server, addSpy;
    before(() => {
        metadataExplorer = new listener_metadata_explorer_1.ListenerMetadataExplorer(new metadata_scanner_1.MetadataScanner());
        explorer = sinon.mock(metadataExplorer);
    });
    beforeEach(() => {
        instance = new listeners_controller_1.ListenersController(new container_1.ClientsContainer());
        instance.metadataExplorer = metadataExplorer;
        addSpy = sinon.spy();
        server = {
            add: addSpy,
        };
    });
    describe('bindPatternHandlers', () => {
        it(`should call add method of server for each pattern handler`, () => {
            const handlers = [
                { pattern: 'test', targetCallback: 'tt' },
                { pattern: 'test2', targetCallback: '2' },
            ];
            explorer.expects('explore').returns(handlers);
            instance.bindPatternHandlers(null, server);
            chai_1.expect(addSpy.calledTwice).to.be.true;
            chai_1.expect(addSpy.calledWith(handlers[0].pattern, handlers[0].targetCallback)).to.be.true;
            chai_1.expect(addSpy.calledWith(handlers[1].pattern, handlers[1].targetCallback)).to.be.true;
        });
    });
});
//# sourceMappingURL=listeners-controller.spec.js.map