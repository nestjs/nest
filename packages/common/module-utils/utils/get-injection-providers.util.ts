import {
  InjectionToken,
  Provider,
  FactoryProvider,
  OptionalFactoryDependency,
} from '../../interfaces';

/**
 * check if x is OptionalFactoryDependency, based on prototype presence
 * (to avoid classes with a static 'token' field)
 * @param x
 * @returns x is OptionalFactoryDependency
 */
function isOptionalFactoryDependency(
  x: InjectionToken | OptionalFactoryDependency,
): x is OptionalFactoryDependency {
  return !!((x as any)?.token && !(x as any)?.prototype);
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
  let search: InjectionToken[] = tokens.map(mapInjectToTokens);
  while (search.length > 0) {
    const match = (providers ?? []).filter(
      p =>
        !result.includes(p) && // this prevents circular loops and duplication
        (search.includes(p as any) || search.includes((p as any)?.provide)),
    );
    result.push(...match);
    // get injection tokens of the matched providers, if any
    search = match
      .filter(p => (p as any)?.inject)
      .map(p => (p as FactoryProvider).inject)
      .flat()
      .map(mapInjectToTokens);
  }
  return result;
}
