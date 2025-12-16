export const mochaHooks = (): Mocha.RootHookObject => {
  // Testing the PR semgrep testing.
  return {
    async beforeAll(this: Mocha.Context) {
      await import('reflect-metadata');
    },
  };
};
