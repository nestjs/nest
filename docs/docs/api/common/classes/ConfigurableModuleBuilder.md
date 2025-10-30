# Class: ConfigurableModuleBuilder\<ModuleOptions, StaticMethodKey, FactoryClassMethodKey, ExtraModuleDefinitionOptions\>

Defined in: packages/common/module-utils/configurable-module.builder.ts:53

Factory that lets you create configurable modules and
provides a way to reduce the majority of dynamic module boilerplate.

## Public Api

## Type Parameters

### ModuleOptions

`ModuleOptions`

### StaticMethodKey

`StaticMethodKey` *extends* `string` = *typeof* `DEFAULT_METHOD_KEY`

### FactoryClassMethodKey

`FactoryClassMethodKey` *extends* `string` = *typeof* `DEFAULT_FACTORY_CLASS_METHOD_KEY`

### ExtraModuleDefinitionOptions

`ExtraModuleDefinitionOptions` = \{ \}

## Constructors

### Constructor

> **new ConfigurableModuleBuilder**\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>(`options`, `parentBuilder?`): `ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/configurable-module.builder.ts:70

#### Parameters

##### options

[`ConfigurableModuleBuilderOptions`](../interfaces/ConfigurableModuleBuilderOptions.md) = `{}`

##### parentBuilder?

`ConfigurableModuleBuilder`\<`ModuleOptions`, `"register"`, `"create"`, \{ \}\>

#### Returns

`ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

## Properties

### extras

> `protected` **extras**: `ExtraModuleDefinitionOptions`

Defined in: packages/common/module-utils/configurable-module.builder.ts:62

***

### factoryClassMethodKey

> `protected` **factoryClassMethodKey**: `FactoryClassMethodKey`

Defined in: packages/common/module-utils/configurable-module.builder.ts:61

***

### logger

> `protected` `readonly` **logger**: [`Logger`](Logger.md)

Defined in: packages/common/module-utils/configurable-module.builder.ts:68

***

### options

> `protected` `readonly` **options**: [`ConfigurableModuleBuilderOptions`](../interfaces/ConfigurableModuleBuilderOptions.md) = `{}`

Defined in: packages/common/module-utils/configurable-module.builder.ts:71

***

### staticMethodKey

> `protected` **staticMethodKey**: `StaticMethodKey`

Defined in: packages/common/module-utils/configurable-module.builder.ts:60

***

### transformModuleDefinition()

> `protected` **transformModuleDefinition**: (`definition`, `extraOptions`) => [`DynamicModule`](../interfaces/DynamicModule.md)

Defined in: packages/common/module-utils/configurable-module.builder.ts:63

#### Parameters

##### definition

[`DynamicModule`](../interfaces/DynamicModule.md)

##### extraOptions

`ExtraModuleDefinitionOptions`

#### Returns

[`DynamicModule`](../interfaces/DynamicModule.md)

## Methods

### build()

> **build**(): [`ConfigurableModuleHost`](../interfaces/ConfigurableModuleHost.md)\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/configurable-module.builder.ts:170

Returns an object consisting of multiple properties that lets you
easily construct dynamic configurable modules. See "ConfigurableModuleHost" interface for more details.

#### Returns

[`ConfigurableModuleHost`](../interfaces/ConfigurableModuleHost.md)\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

***

### setClassMethodName()

> **setClassMethodName**\<`StaticMethodKey`\>(`key`): `ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/configurable-module.builder.ts:131

Dynamic modules must expose public static methods that let you pass in
configuration parameters (control the module's behavior from the outside).
Some frequently used names that you may have seen in other modules are:
"forRoot", "forFeature", "register", "configure".

This method "setClassMethodName" lets you specify the name of the
method that will be auto-generated.

#### Type Parameters

##### StaticMethodKey

`StaticMethodKey` *extends* `string`

#### Parameters

##### key

`StaticMethodKey`

name of the method

#### Returns

`ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

***

### setExtras()

> **setExtras**\<`ExtraModuleDefinitionOptions`\>(`extras`, `transformDefinition`): `ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/configurable-module.builder.ts:102

Registers the "extras" object (a set of extra options that can be used to modify the dynamic module definition).
Values you specify within the "extras" object will be used as default values (that can be overridden by module consumers).

This method also applies the so-called "module definition transform function" that takes the auto-generated
dynamic module object ("DynamicModule") and the actual consumer "extras" object as input parameters.
The "extras" object consists of values explicitly specified by module consumers and default values.

#### Type Parameters

##### ExtraModuleDefinitionOptions

`ExtraModuleDefinitionOptions`

#### Parameters

##### extras

`ExtraModuleDefinitionOptions`

##### transformDefinition

(`definition`, `extras`) => [`DynamicModule`](../interfaces/DynamicModule.md)

#### Returns

`ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

#### Example

```typescript
.setExtras<{ isGlobal?: boolean }>({ isGlobal: false }, (definition, extras) =>
   ({ ...definition, global: extras.isGlobal })
)
```

***

### setFactoryMethodName()

> **setFactoryMethodName**\<`FactoryClassMethodKey`\>(`key`): `ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>

Defined in: packages/common/module-utils/configurable-module.builder.ts:153

Asynchronously configured modules (that rely on other modules, i.e. "ConfigModule")
let you pass the configuration factory class that will be registered and instantiated as a provider.
This provider then will be used to retrieve the module's configuration. To provide the configuration,
the corresponding factory method must be implemented.

This method ("setFactoryMethodName") lets you control what method name will have to be
implemented by the config factory (default is "create").

#### Type Parameters

##### FactoryClassMethodKey

`FactoryClassMethodKey` *extends* `string`

#### Parameters

##### key

`FactoryClassMethodKey`

name of the method

#### Returns

`ConfigurableModuleBuilder`\<`ModuleOptions`, `StaticMethodKey`, `FactoryClassMethodKey`, `ExtraModuleDefinitionOptions`\>
