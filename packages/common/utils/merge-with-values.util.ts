export interface Constructor<T> {
  new (...args: any[]): T;
}

export const MergeWithValues = <T extends Constructor<{}>>(data: {
  [param: string]: any;
}) => {
  return (Metatype: T): any => {
    const Type = class extends Metatype {
      constructor(...args) {
        super(...args);
      }
    };
    const token = Metatype.name + JSON.stringify(data);
    Object.defineProperty(Type, 'name', { value: token });
    Object.assign(Type.prototype, data);
    return Type;
  };
};
