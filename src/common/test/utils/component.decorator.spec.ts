import 'reflect-metadata';
import 'mocha';
import { expect } from 'chai';
import { Component } from '../../utils/component.decorator';

describe('@Component', () => {

    @Component()
    class TestComponent {
        constructor(
            param: number,
            test: string) {}
    }

    it('should enhance transport with "design:paramtypes" metadata', () => {
        const constructorParams = Reflect.getMetadata('design:paramtypes', TestComponent);

        expect(constructorParams[0]).to.be.eql(Number);
        expect(constructorParams[1]).to.be.eql(String);
    });

});