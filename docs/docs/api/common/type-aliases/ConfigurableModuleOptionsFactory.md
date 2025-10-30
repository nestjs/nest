# Type Alias: ConfigurableModuleOptionsFactory\<ModuleOptions, FactoryClassMethodKey\>

> **ConfigurableModuleOptionsFactory**\<`ModuleOptions`, `FactoryClassMethodKey`\> = `Record`\<`` `${FactoryClassMethodKey}` ``, () => `Promise`\<`ModuleOptions`\> \| `ModuleOptions`\>

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:15

Interface that must be implemented by the module options factory class.
Method key varies depending on the "FactoryClassMethodKey" type argument.

## Type Parameters

### ModuleOptions

`ModuleOptions`

### FactoryClassMethodKey

`FactoryClassMethodKey` *extends* `string`

## Public Api
