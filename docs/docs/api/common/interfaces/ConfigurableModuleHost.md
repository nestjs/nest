# Interface: ConfigurableModuleHost\<ModuleOptions, MethodKey, FactoryClassMethodKey, ExtraModuleDefinitionOptions\>

Defined in: packages/common/module-utils/interfaces/configurable-module-host.interface.ts:10

Configurable module host. See properties for more details

## Public Api

## Type Parameters

### ModuleOptions

`ModuleOptions` = `Record`\<`string`, `unknown`\>

### MethodKey

`MethodKey` *extends* `string` = `string`

### FactoryClassMethodKey

`FactoryClassMethodKey` *extends* `string` = `string`

### ExtraModuleDefinitionOptions

`ExtraModuleDefinitionOptions` = \{ \}

## Properties

### ASYNC\_OPTIONS\_TYPE

> **ASYNC\_OPTIONS\_TYPE**: [`ConfigurableModuleAsyncOptions`](ConfigurableModuleAsyncOptions.md)\<`ModuleOptions`, `FactoryClassMethodKey`\> & `Partial`\<`ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/interfaces/configurable-module-host.interface.ts:57

Can be used to auto-infer the compound "async module options" type.
Note: this property is not supposed to be used as a value.

#### Example

```typescript
@Module({})
class IntegrationModule extends ConfigurableModuleCls {
 static module = initializer(IntegrationModule);

static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
 return super.registerAsync(options);
}
```

***

### ConfigurableModuleClass

> **ConfigurableModuleClass**: [`ConfigurableModuleCls`](../type-aliases/ConfigurableModuleCls.md)\<`ModuleOptions`, `MethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/interfaces/configurable-module-host.interface.ts:31

Class that represents a blueprint/prototype for a configurable Nest module.
This class provides static methods for constructing dynamic modules. Their names
can be controlled through the "MethodKey" type argument.

Your module class should inherit from this class to make the static methods available.

#### Example

```typescript
@Module({})
class IntegrationModule extends ConfigurableModuleCls {
 // ...
}
```

***

### MODULE\_OPTIONS\_TOKEN

> **MODULE\_OPTIONS\_TOKEN**: `string` \| `symbol`

Defined in: packages/common/module-utils/interfaces/configurable-module-host.interface.ts:41

Module options provider token. Can be used to inject the "options object" to
providers registered within the host module.

***

### OPTIONS\_TYPE

> **OPTIONS\_TYPE**: `ModuleOptions` & `Partial`\<`ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/interfaces/configurable-module-host.interface.ts:77

Can be used to auto-infer the compound "module options" type (options interface + extra module definition options).
Note: this property is not supposed to be used as a value.

#### Example

```typescript
@Module({})
class IntegrationModule extends ConfigurableModuleCls {
 static module = initializer(IntegrationModule);

static register(options: typeof OPTIONS_TYPE): DynamicModule {
 return super.register(options);
}
```
