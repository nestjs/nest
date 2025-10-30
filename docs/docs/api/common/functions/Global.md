# Function: Global()

> **Global**(): `ClassDecorator`

Defined in: packages/common/decorators/modules/global.decorator.ts:14

Decorator that makes a module global-scoped.

Once imported into any module, a global-scoped module will be visible
in all modules. Thereafter, modules that wish to inject a service exported
from a global module do not need to import the provider module.

## Returns

`ClassDecorator`

## See

[Global modules](https://docs.nestjs.com/modules#global-modules)

## Public Api
