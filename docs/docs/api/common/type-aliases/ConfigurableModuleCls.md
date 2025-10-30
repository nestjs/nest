# Type Alias: ConfigurableModuleCls\<ModuleOptions, MethodKey, FactoryClassMethodKey, ExtraModuleDefinitionOptions\>

> **ConfigurableModuleCls**\<`ModuleOptions`, `MethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\> = () => `any` & `Record`\<`` `${MethodKey}` ``, (`options`) => [`DynamicModule`](../interfaces/DynamicModule.md)\> & `Record`\<`` `${MethodKey}Async` ``, (`options`) => [`DynamicModule`](../interfaces/DynamicModule.md)\>

Defined in: packages/common/module-utils/interfaces/configurable-module-cls.interface.ts:16

Class that represents a blueprint/prototype for a configurable Nest module.
This class provides static methods for constructing dynamic modules. Their names
can be controlled through the "MethodKey" type argument.

## Type Parameters

### ModuleOptions

`ModuleOptions`

### MethodKey

`MethodKey` *extends* `string` = *typeof* `DEFAULT_METHOD_KEY`

### FactoryClassMethodKey

`FactoryClassMethodKey` *extends* `string` = *typeof* `DEFAULT_FACTORY_CLASS_METHOD_KEY`

### ExtraModuleDefinitionOptions

`ExtraModuleDefinitionOptions` = \{ \}

## Public Api
