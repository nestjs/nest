# Interface: ConfigurableModuleBuilderOptions

Defined in: packages/common/module-utils/configurable-module.builder.ts:23

## Public Api

## Properties

### alwaysTransient?

> `optional` **alwaysTransient**: `boolean`

Defined in: packages/common/module-utils/configurable-module.builder.ts:44

Indicates whether module should always be "transient" - meaning,
every time you call the static method to construct a dynamic module,
regardless of what arguments you pass in, a new "unique" module will be created.

#### Default

```ts
false
```

***

### moduleName?

> `optional` **moduleName**: `string`

Defined in: packages/common/module-utils/configurable-module.builder.ts:36

By default, an UUID will be used as a module options provider token.
Explicitly specifying the "moduleName" will instruct the "ConfigurableModuleBuilder"
to use a more descriptive provider token.

For example, `moduleName: "Cache"` will auto-generate the provider token: "CACHE_MODULE_OPTIONS".

***

### optionsInjectionToken?

> `optional` **optionsInjectionToken**: `string` \| `symbol`

Defined in: packages/common/module-utils/configurable-module.builder.ts:28

Specifies what injection token should be used for the module options provider.
By default, an auto-generated UUID will be used.
