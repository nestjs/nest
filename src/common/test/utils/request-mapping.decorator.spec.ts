import 'reflect-metadata';
import { expect } from 'chai';
import { RequestMapping } from '../../utils/request-mapping.decorator';
import { RequestMethod } from '../../enums/request-method.enum';

describe('@RequestMapping', () => {
    const requestProps = {
        path: 'test',
        method: RequestMethod.ALL
    };

    it('should decorate type with expected request metadata', () => {
        class Test {
            @RequestMapping(requestProps)
            static test() {}
        }

        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);

        expect(method).to.be.eql(requestProps.method);
        expect(path).to.be.eql(requestProps.path);
    });

    it('should set request method on GET by default', () => {
        class Test {
            @RequestMapping({ path: '' })
            static test() {}
        }

        const method = Reflect.getMetadata('method', Test.test);
        expect(method).to.be.eql(RequestMethod.GET);
    });

    it('should set path on "/" by default', () => {
        class Test {
            @RequestMapping({})
            static test() {}
        }

        const method = Reflect.getMetadata('path', Test.test);
        expect(method).to.be.eql('/');
    });

});