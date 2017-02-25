import { MiddlewareConfiguration } from './interfaces/middleware-configuration.interface';
import { InvalidMiddlewareConfigurationException } from '../../errors/exceptions/invalid-middleware-configuration.exception';
import { isUndefined } from '../../common/utils/shared.utils';

export class MiddlewareBuilder {
    private storedConfiguration = new Set<MiddlewareConfiguration>();

    use(configuration: MiddlewareConfiguration) {
        const { middlewares, forRoutes } = configuration;
        if (isUndefined(middlewares) || isUndefined(forRoutes)) {
            throw new InvalidMiddlewareConfigurationException();
        }

        this.storedConfiguration.add(configuration);
        return this;
    }

    build() {
        return [ ...this.storedConfiguration ];
    }

}