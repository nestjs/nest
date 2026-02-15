export async function optionalRequire(
  packageName: string,
  loaderFn?: Function,
) {
  try {
    return loaderFn ? await loaderFn() : await import(packageName);
  } catch (e) {
    return {};
  }
}
