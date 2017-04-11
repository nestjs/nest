import 'reflect-metadata';

export interface Constructor<T> {
    new(...args: any[]): T
}

export const MergeWithValues = <T extends Constructor<{}>>(data: { [param: string]: any }) => {
    return (metatype: T): any => {
        const type = class extends metatype {
            constructor(...args) {
                super(...args);
            }
        };
        const token = metatype.name + JSON.stringify(data);
        Object.defineProperty(type, 'name', { value: token });
        Object.assign(type.prototype, data);
        return type;
    }
};
