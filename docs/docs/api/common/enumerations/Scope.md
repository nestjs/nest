# Enumeration: Scope

Defined in: packages/common/interfaces/scope-options.interface.ts:4

## Public Api

## Enumeration Members

### DEFAULT

> **DEFAULT**: `0`

Defined in: packages/common/interfaces/scope-options.interface.ts:10

The provider can be shared across multiple classes. The provider lifetime
is strictly tied to the application lifecycle. Once the application has
bootstrapped, all providers have been instantiated.

***

### REQUEST

> **REQUEST**: `2`

Defined in: packages/common/interfaces/scope-options.interface.ts:18

A new instance is instantiated for each request processing pipeline

***

### TRANSIENT

> **TRANSIENT**: `1`

Defined in: packages/common/interfaces/scope-options.interface.ts:14

A new private instance of the provider is instantiated for every use
