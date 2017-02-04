import { MiddlewareConfiguration } from "./interfaces/middleware-configuration.interface";
import { InvalidMiddlewareConfigurationException } from "../../errors/exceptions/invalid-middleware-configuration.exception";

export class MiddlewareBuilder {
    private storedConfiguration = new Set<MiddlewareConfiguration>();

    use(configuration: MiddlewareConfiguration) {
        if (typeof configuration.middlewares === "undefined" ||
            typeof configuration.forRoutes === "undefined") {

            throw new InvalidMiddlewareConfigurationException();
        }

        this.storedConfiguration.add(configuration);
        return this;
    }

    build() {
        return [ ...this.storedConfiguration ];
    }

}