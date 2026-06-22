---
name: check-conformance
description: >-
  Check whether pipes/guards/interceptors/exceptions/decorators have test
  coverage per repo convention, before opening a PR. Use after changing
  packages/common/{pipes,exceptions,serializer,decorators}, packages/core/{guards,interceptors,exceptions},
  or packages/microservices/exceptions, or when drafting a PR per lifecycle-trace.mdc.
---

# Check Conformance

Executable version of the "specs mirror source, never colocated" convention from
`tests.mdc` / `pipes.mdc` / `guards.mdc` / `interceptors.mdc` / `exception-filters.mdc` /
`decorators.mdc`. Run it instead of eyeballing the diff for missing specs.

```bash
sh .cursor/skills/check-conformance/check.sh       # flags real gaps only
sh .cursor/skills/check-conformance/check.sh -v    # also lists indirectly-covered files
```

## What it does

For each source file under the 5 concept areas, it looks for a spec in two tiers:

1. **Mirrored spec exists** (e.g. `packages/common/pipes/foo.pipe.ts` →
   `packages/common/test/pipes/foo.pipe.spec.ts`) → pass, silent.
2. **No mirrored spec** → falls back to grepping the file's exported class/function/const
   name across the whole package's `test/` tree. If found, it's printed as `INDIRECT` (only
   with `-v`) rather than `MISSING` — this is what legitimately happens for the ~21 built-in
   HTTP exception subclasses (all asserted together in `http.exception.spec.ts`) and a couple
   of support classes (`BaseExceptionFilterContext`, `ExternalExceptionFilter`) exercised only
   through a consumer's spec.

`index.ts`, `*.interface.ts` / `*.interfaces.ts`, and `constants.ts` / `*.constants.ts` files
are exempt (no behavior to test).

## Reading the output

- `MISSING SPEC` — no mirrored spec and no reference anywhere in the package's `test/` tree.
  Treat as a real gap; add a spec or confirm it's dead code.
- `INDIRECT` (with `-v`) — covered, but only through another file's spec. Fine to leave, but
  if you're touching that file's behavior, consider whether it now deserves its own spec.
- Exit code is always `0` — this is a nudge for PR prep (see `lifecycle-trace.mdc`), not a CI
  gate. Wire it into `lint-staged`/CI yourself if you want it to block.

## Known limitation

The symbol-name grep is best-effort (first `export class|function|const` in the file). A file
with no top-level export, or one whose only export name collides with an unrelated identifier
elsewhere in `test/`, can produce a wrong verdict — read the flagged file before trusting the
output blindly.
