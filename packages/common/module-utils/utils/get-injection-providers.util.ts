import { isUndefined } from '../../utils/shared.utils.js';
import {
  ExistingProvider,
  FactoryProvider,
  InjectionToken,
  OptionalFactoryDependency,
  Provider,
} from '../../interfaces/index.js';

/**
 * @param value
 * @returns `true` if value is `OptionalFactoryDependency`
 */
function isOptionalFactoryDependency(
  value: InjectionToken | OptionalFactoryDependency,
): value is OptionalFactoryDependency {
  return (
    !isUndefined((value as OptionalFactoryDependency).token) &&
    !isUndefined((value as OptionalFactoryDependency).optional) &&
    !(value as any).prototype
  );
}

const mapInjectToTokens = (t: InjectionToken | OptionalFactoryDependency) =>
  isOptionalFactoryDependency(t) ? t.token : t;

/**
 *
 * @param providers List of a module's providers
 * @param tokens Injection tokens needed for a useFactory function (usually the module's options' token)
 * @returns All the providers needed for the tokens' injection (searched recursively)
 */
export function getInjectionProviders(
  providers: Provider[],
  tokens: FactoryProvider['inject'],
): Provider[] {
  const result: Provider[] = [];
  let search: InjectionToken[] = tokens!.map(mapInjectToTokens);
  while (search.length > 0) {
    const match = (providers ?? []).filter(
      p =>
        !result.includes(p) && // this prevents circular loops and duplication
        (search.includes(p as any) || search.includes((p as any)?.provide)),
    );
    result.push(...match);
    // Follow factory dependencies and aliases to existing providers.
    search = match
      .flatMap(p =>
        (p as ExistingProvider)?.useExisting !== undefined
          ? [(p as ExistingProvider).useExisting]
          : ((p as FactoryProvider)?.inject ?? []),
      )
      .map(mapInjectToTokens);
  }
  return result;
}
