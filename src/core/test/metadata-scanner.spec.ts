import { expect } from 'chai';
import { MetadataScanner } from '../metadata-scanner';

describe('MetadataScanner', () => {
    let scanner: MetadataScanner;
    beforeEach(() => {
        scanner = new MetadataScanner();
    });
    describe('scanFromPrototype', () => {
        class Test {
            constructor() {}
            get prop() { return ''; }
            set val(value) {}
            public test() {}
            public test2() {}
        }
        it('should returns only methods', () => {
            const methods = scanner.scanFromPrototype(new Test(), Test.prototype, a => a);
            expect(methods).to.eql(['test', 'test2']);
        });
        it('should filter null and undefined results', () => {

        });
        it('should call callback for each method', () => {

        });
    });
});