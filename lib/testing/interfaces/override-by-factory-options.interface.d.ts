export interface OverrideByFactoryOptions {
    factory: (...args) => any;
    inject?: any[];
}
