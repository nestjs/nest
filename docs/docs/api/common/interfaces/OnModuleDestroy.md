# Interface: OnModuleDestroy

Defined in: packages/common/interfaces/hooks/on-destroy.interface.ts:10

Interface defining method called just before Nest destroys the host module
(`app.close()` method has been evaluated).  Use to perform cleanup on
resources (e.g., Database connections).

## See

[Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)

## Public Api

## Methods

### onModuleDestroy()

> **onModuleDestroy**(): `any`

Defined in: packages/common/interfaces/hooks/on-destroy.interface.ts:11

#### Returns

`any`
