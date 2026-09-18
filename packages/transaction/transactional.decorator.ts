import { TransactionalOptions } from './interfaces/transactional-options.interface.js';
import { runTransactional } from './run-transactional.js';

/**
 * Wraps a method so it runs inside a database transaction.
 *
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   @Transactional()
 *   async createOrder(dto: CreateOrderDto) {
 *     await this.orders.create(dto);
 *     await this.inventory.reserve(dto.productId);
 *   }
 * }
 * ```
 *
 * With the default `propagation: 'REQUIRED'`:
 * - if no transaction is active, one is started before the method runs,
 *   committed if it resolves, and rolled back (with the original error
 *   re-thrown) if it throws/rejects;
 * - if a transaction is already active (e.g. this method was called from
 *   another `@Transactional()` method), it joins that transaction instead of
 *   starting a new one — there is exactly one `BEGIN`/`COMMIT` pair for the
 *   whole call chain.
 *
 * The transaction is made available to database calls performed inside the
 * method (directly or through other injected services) via
 * `AsyncLocalStorage`, without needing to pass a transaction object through
 * every call — support for this depends on the registered
 * {@link TransactionAdapter}. Requires `TransactionModule.forRoot()` (or
 * `forRootAsync()`) to be imported somewhere in the application; see there
 * for how an adapter is registered.
 *
 * `Promise.all()` does not, by itself, make concurrent operations
 * transactionally safe — see `TransactionModule`'s docs for the distinction
 * between promise coordination and database transaction boundaries.
 *
 * @publicApi
 */
export function Transactional(
  options: TransactionalOptions = {},
): MethodDecorator {
  const propagation = options.propagation ?? 'REQUIRED';

  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    if (typeof originalMethod !== 'function') {
      throw new TypeError('@Transactional() can only be applied to methods.');
    }

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      return runTransactional(propagation, () =>
        originalMethod.apply(this, args),
      );
    };

    Object.defineProperty(descriptor.value, 'name', {
      value: originalMethod.name,
      configurable: true,
    });
    Object.defineProperty(descriptor.value, 'length', {
      value: originalMethod.length,
      configurable: true,
    });

    return descriptor;
  };
}
