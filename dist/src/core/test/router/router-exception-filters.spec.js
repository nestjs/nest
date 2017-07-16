"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const router_exception_filters_1 = require("../../router/router-exception-filters");
const exception_filters_decorator_1 = require("../../../common/utils/decorators/exception-filters.decorator");
const catch_decorator_1 = require("../../../common/utils/decorators/catch.decorator");
const application_config_1 = require("../../application-config");
describe('RouterExceptionFilters', () => {
    let moduleName;
    let exceptionFilter;
    class CustomException {
    }
    let ExceptionFilter = class ExceptionFilter {
        catch(exc, res) { }
    };
    ExceptionFilter = __decorate([
        catch_decorator_1.Catch(CustomException)
    ], ExceptionFilter);
    beforeEach(() => {
        moduleName = 'Test';
        exceptionFilter = new router_exception_filters_1.RouterExceptionFilters(new application_config_1.ApplicationConfig());
    });
    describe('create', () => {
        describe('when filters metadata is empty', () => {
            class EmptyMetadata {
            }
            beforeEach(() => {
                sinon.stub(exceptionFilter, 'createContext').returns([]);
            });
            it('should returns plain ExceptionHandler object', () => {
                const filter = exceptionFilter.create(new EmptyMetadata(), () => ({}));
                chai_1.expect(filter.filters).to.be.empty;
            });
        });
        describe('when filters metadata is not empty', () => {
            let WithMetadata = class WithMetadata {
            };
            WithMetadata = __decorate([
                exception_filters_decorator_1.ExceptionFilters(new ExceptionFilter())
            ], WithMetadata);
            it('should returns ExceptionHandler object with exception filters', () => {
                const filter = exceptionFilter.create(new WithMetadata(), () => ({}));
                chai_1.expect(filter.filters).to.not.be.empty;
            });
        });
    });
    describe('reflectCatchExceptions', () => {
        it('should returns FILTER_CATCH_EXCEPTIONS metadata', () => {
            chai_1.expect(exceptionFilter.reflectCatchExceptions(new ExceptionFilter())).to.be.eql([CustomException]);
        });
    });
    describe('createConcreteContext', () => {
        class InvalidFilter {
        }
        const filters = [new ExceptionFilter(), new InvalidFilter(), 'test'];
        beforeEach(() => {
            sinon.stub(exceptionFilter, 'findExceptionsFilterInstance').onFirstCall().returns({
                catch: () => ({}),
            }).onSecondCall().returns({});
        });
        it('should returns expected exception filters metadata', () => {
            const resolved = exceptionFilter.createConcreteContext(filters);
            chai_1.expect(resolved).to.have.length(1);
            chai_1.expect(resolved[0].exceptionMetatypes).to.be.deep.equal([CustomException]);
            chai_1.expect(resolved[0].func).to.be.a('function');
        });
    });
});
//# sourceMappingURL=router-exception-filters.spec.js.map