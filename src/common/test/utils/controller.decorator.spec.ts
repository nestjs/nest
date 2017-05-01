import 'reflect-metadata';
import { expect } from 'chai';
import { Controller } from '../../utils/decorators/controller.decorator';

describe('@Controller', () => {
    const props = {
        path: 'test',
    };

    @Controller(props) class Test {}
    @Controller() class EmptyDecorator {}
    @Controller({}) class AnotherTest {}

    it('should enhance controller with expected path metadata', () => {
        const path = Reflect.getMetadata('path', Test);
        expect(path).to.be.eql(props.path);
    });

    it('should set default path when no object passed as param', () => {
        const path = Reflect.getMetadata('path', EmptyDecorator);
        expect(path).to.be.eql('/');
    });

    it('should set default path when empty passed as param', () => {
        const path = Reflect.getMetadata('path', AnotherTest);
        expect(path).to.be.eql('/');
    });

});