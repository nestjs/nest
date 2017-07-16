"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const metadata_scanner_1 = require("../metadata-scanner");
describe('MetadataScanner', () => {
    let scanner;
    beforeEach(() => {
        scanner = new metadata_scanner_1.MetadataScanner();
    });
    describe('scanFromPrototype', () => {
        class Test {
            constructor() { }
            get prop() { return ''; }
            set val(value) { }
            test() { }
            test2() { }
        }
        it('should returns only methods', () => {
            const methods = scanner.scanFromPrototype(new Test(), Test.prototype, a => a);
            chai_1.expect(methods).to.eql(['test', 'test2']);
        });
        it('should filter null and undefined results', () => {
        });
        it('should call callback for each method', () => {
        });
    });
});
//# sourceMappingURL=metadata-scanner.spec.js.map