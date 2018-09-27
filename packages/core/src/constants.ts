// No enum support for ts-jest

/**
 export enum METADATA {
  IMPORTS = 'imports',
  EXPORTS = 'exports',
  PROVIDERS = 'providers',
}
 export enum SCOPES {
  SINGLETON = 'singleton-scope',
  TRANSIENT = 'transient-scope',
  REQUEST = 'request-scope',
}

 export enum PROVIDER_TYPES {
  FACTORY = 'use-factory',
  CLASS = 'use-class',
  EXISTING = 'use-existing',
  VALUE = 'use-value',
  DEFAULT = 'provider',
}
 */
export const SHARED_MODULE_METADATA = Symbol.for('Metadata<SharedModule>');
export const SCOPE_METADATA = Symbol.for('Metadata<Scope>');
export const PROVIDER_METADATA = Symbol.for('Metadata<Provider>');

export const METADATA = {
  IMPORTS: 'imports',
  EXPORTS: 'exports',
  PROVIDERS: 'providers',
};

export const SCOPES = {
  SINGLETON: 'singleton-scope',
  TRANSIENT: 'transient-scope',
  REQUEST: 'request-scope',
};

export const PROVIDER_TYPES = {
  FACTORY: 'use-factory',
  CLASS: 'use-class',
  EXISTING: 'use-existing',
  VALUE: 'use-value',
  DEFAULT: 'provider',
};
