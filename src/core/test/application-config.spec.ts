import { expect } from 'chai';
import { ApplicationConfig } from '../application-config';

describe('ApplicationConfig', () => {
    let appConfig: ApplicationConfig;

    beforeEach(() => {
        appConfig = new ApplicationConfig();
    });
    describe('globalPath', () => {
        it('should set global path', () => {
            const path = 'test';
            appConfig.setGlobalPrefix(path);

            expect(appConfig.getGlobalPrefix()).to.be.eql(path);
        });
        it('should has empty string as a global path by default', () => {
            expect(appConfig.getGlobalPrefix()).to.be.eql('');
        });
    });
});