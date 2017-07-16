"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const shared_utils_1 = require("../../utils/shared.utils");
describe('Shared utils', () => {
    describe('isUndefined', () => {
        it('should returns true when obj is undefined', () => {
            chai_1.expect(shared_utils_1.isUndefined(undefined)).to.be.true;
        });
        it('should returns false when object is not undefined', () => {
            chai_1.expect(shared_utils_1.isUndefined({})).to.be.false;
        });
    });
    describe('isFunction', () => {
        it('should returns true when obj is function', () => {
            chai_1.expect(shared_utils_1.isFunction(() => ({}))).to.be.true;
        });
        it('should returns false when object is not function', () => {
            chai_1.expect(shared_utils_1.isFunction(null)).to.be.false;
        });
    });
    describe('isObject', () => {
        it('should returns true when obj is object', () => {
            chai_1.expect(shared_utils_1.isObject({})).to.be.true;
        });
        it('should returns false when object is not object', () => {
            chai_1.expect(shared_utils_1.isObject(3)).to.be.false;
        });
    });
    describe('isString', () => {
        it('should returns true when obj is string', () => {
            chai_1.expect(shared_utils_1.isString('true')).to.be.true;
        });
        it('should returns false when object is not string', () => {
            chai_1.expect(shared_utils_1.isString(false)).to.be.false;
        });
    });
    describe('isConstructor', () => {
        it('should returns true when string is equal constructor', () => {
            chai_1.expect(shared_utils_1.isConstructor('constructor')).to.be.true;
        });
        it('should returns false when string is not equal constructor', () => {
            chai_1.expect(shared_utils_1.isConstructor('nope')).to.be.false;
        });
    });
    describe('validatePath', () => {
        it('should returns validated path ("add / if not exists")', () => {
            chai_1.expect(shared_utils_1.validatePath('nope')).to.be.eql('/nope');
        });
        it('should returns same path', () => {
            chai_1.expect(shared_utils_1.validatePath('/nope')).to.be.eql('/nope');
        });
    });
    describe('isNil', () => {
        it('should returns true when obj is undefined or null', () => {
            chai_1.expect(shared_utils_1.isNil(undefined)).to.be.true;
            chai_1.expect(shared_utils_1.isNil(null)).to.be.true;
        });
        it('should returns false when object is not undefined and null', () => {
            chai_1.expect(shared_utils_1.isNil('3')).to.be.false;
        });
    });
    describe('isEmpty', () => {
        it('should returns true when array is empty or not exists', () => {
            chai_1.expect(shared_utils_1.isEmpty([])).to.be.true;
            chai_1.expect(shared_utils_1.isEmpty(null)).to.be.true;
        });
        it('should returns false when array is not empty', () => {
            chai_1.expect(shared_utils_1.isEmpty([1, 2])).to.be.false;
        });
    });
});
//# sourceMappingURL=shared.utils.spec.js.map