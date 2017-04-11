import { MiddlewareConfiguration } from './interfaces/middleware-configuration.interface';
import { InvalidMiddlewareConfigurationException } from '../../errors/exceptions/invalid-middleware-configuration.exception';
import { isUndefined, isNil } from '../../common/utils/shared.utils';
import { BindResolveMiddlewareValues } from '../../common/utils/bind-resolve-values.util';
import { Logger } from '../../common/services/logger.service';
import { Metatype } from '../../common/interfaces/metatype.interface';

export class MiddlewareBuilder {
    private middlewaresCollection = new Set<MiddlewareConfiguration>();
    private logger = new Logger(MiddlewareBuilder.name);

    apply(metatypes: Metatype<any> | Array<Metatype<any>>): MiddlewareConfigProxy {
        let resolveParams = null;
        const configProxy = {
            with: (...data) => {
                resolveParams = data;
                return configProxy as MiddlewareConfigProxy;
            },
            forRoutes: (...routes) => {
                const configuration = {
                    middlewares: this.bindValuesToResolve(metatypes, resolveParams),
                    forRoutes: routes
                };
                this.middlewaresCollection.add(<MiddlewareConfiguration>configuration);
                return this;
            }
        };
        return configProxy;
    }

    /**
     * @deprecated
     * Since version RC.6 this method is deprecated. Use apply() instead.
     */
    use(configuration: MiddlewareConfiguration) {
        this.logger.warn('DEPRECATED! Since version RC.6 `use()` method is deprecated. Use `apply()` instead.');

        const { middlewares, forRoutes } = configuration;
        if (isUndefined(middlewares) || isUndefined(forRoutes)) {
            throw new InvalidMiddlewareConfigurationException();
        }

        this.middlewaresCollection.add(configuration);
        return this;
    }

    build() {
        return [ ...this.middlewaresCollection ];
    }

    private bindValuesToResolve(middlewares: Metatype<any> | Array<Metatype<any>>, resolveParams: Array<any>) {
        if (isNil(resolveParams)) {
            return middlewares;
        }
        const bindArgs = BindResolveMiddlewareValues(resolveParams);
        return [].concat(middlewares).map(bindArgs);
    }
}

export interface MiddlewareConfigProxy {
    with: (...data) => MiddlewareConfigProxy;
    forRoutes: (...routes) => MiddlewareBuilder;
}