import "reflect-metadata";
import { expect } from "chai";
import { RequestMapping } from "../../utils/request-mapping.decorator";
import { RequestMethod } from "../../enums/request-method.enum";
import { InvalidPathVariableException } from "../../../errors/exceptions/invalid-path-variable.exception";

describe('@RequestMapping', () => {
    const requestProps = {
        path: "test",
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
            @RequestMapping({ path: "" })
            static test() {}
        }

        const method = Reflect.getMetadata('method', Test.test);
        expect(method).to.be.eql(RequestMethod.GET);
    });

    it('should throw exception when path variable is not set', () => {
        expect(RequestMapping.bind(null, {})).throw(InvalidPathVariableException);
    });

});