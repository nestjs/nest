"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const pipes_context_creator_1 = require("./../../pipes/pipes-context-creator");
describe('PipesContextCreator', () => {
    let creator;
    beforeEach(() => {
        creator = new pipes_context_creator_1.PipesContextCreator(null);
    });
    describe('createConcreteContext', () => {
        describe('when metadata is empty or undefined', () => {
            it('should returns empty array', () => {
                chai_1.expect(creator.createConcreteContext(undefined)).to.be.deep.equal([]);
                chai_1.expect(creator.createConcreteContext([])).to.be.deep.equal([]);
            });
        });
        describe('when metadata is not empty or undefined', () => {
            const metadata = [
                null,
                {},
                { transform: () => ({}) },
            ];
            it('should returns expected array', () => {
                const transforms = creator.createConcreteContext(metadata);
                chai_1.expect(transforms).to.have.length(1);
            });
        });
    });
});
//# sourceMappingURL=pipes-context-creator.spec.js.map