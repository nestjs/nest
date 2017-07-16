"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const application_config_1 = require("../application-config");
describe('ApplicationConfig', () => {
    let appConfig;
    beforeEach(() => {
        appConfig = new application_config_1.ApplicationConfig();
    });
    describe('globalPath', () => {
        it('should set global path', () => {
            const path = 'test';
            appConfig.setGlobalPrefix(path);
            chai_1.expect(appConfig.getGlobalPrefix()).to.be.eql(path);
        });
        it('should has empty string as a global path by default', () => {
            chai_1.expect(appConfig.getGlobalPrefix()).to.be.eql('');
        });
    });
});
//# sourceMappingURL=application-config.spec.js.map