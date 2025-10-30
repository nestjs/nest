# Interface: CanActivate

Defined in: packages/common/interfaces/features/can-activate.interface.ts:14

Interface defining the `canActivate()` function that must be implemented
by a guard.  Return value indicates whether or not the current request is
allowed to proceed.  Return can be either synchronous (`boolean`)
or asynchronous (`Promise` or `Observable`).

## See

[Guards](https://docs.nestjs.com/guards)

## Public Api

## Methods

### canActivate()

> **canActivate**(`context`): `any`

Defined in: packages/common/interfaces/features/can-activate.interface.ts:22

#### Parameters

##### context

[`ExecutionContext`](ExecutionContext.md)

Current execution context. Provides access to details about
the current request pipeline.

#### Returns

`any`

Value indicating whether or not the current request is allowed to
proceed.
