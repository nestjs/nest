import 'reflect-metadata';

interface Constructor<T> {
    new(...args: any[]): T
}

export const ProvideValues = <T extends Constructor<{}>>(data) => {
    return (metatype: T) => {
        const type = class extends metatype {
            constructor(...args) {
                super(args);
                Object.assign(this, data);
            }
        };
        const token = metatype.name + JSON.stringify(data);
        Object.defineProperty(type, 'name', { value: token });
        return type;
    }
};