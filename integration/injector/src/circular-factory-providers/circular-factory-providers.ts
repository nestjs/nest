export const dynamicProvider1 = {
  provide: 'PROVIDER1',
  useFactory: (provider2: any) => {
    return {
      name: 'provider 1',
    };
  },
  inject: ['PROVIDER2'],
};

export const dynamicProvider2 = {
  provide: 'PROVIDER2',
  useFactory: (provider3: any) => {
    return {
      name: 'provider 2',
    };
  },
  inject: ['PROVIDER3'],
};

export const dynamicProvider3 = {
  provide: 'PROVIDER3',
  useFactory: (provider1: any) => {
    return {
      name: 'provider 3',
    };
  },
  inject: ['PROVIDER1'],
};

export const dynamicProvider4 = {
  provide: 'PROVIDER4',
  useFactory: (provider5: any) => {
    return {
      name: 'provider 4',
    };
  },
  inject: ['PROVIDER5'],
};

export const dynamicProvider5 = {
  provide: 'PROVIDER5',
  useFactory: () => {
    return {
      name: 'provider 5',
    };
  },
};
