# NestJS Developer Guide

Local setup for working in the NestJS **framework monorepo** (the source of `@nestjs/*`
packages). This is not a single deployable app — you build the packages, then run or
test against the apps under `sample/` and `integration/`.

For contribution workflow (PRs, commits, coding rules), see [CONTRIBUTING.md](../CONTRIBUTING.md).
For package layout and change-impact guidance, see [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js >= 20** | Required by root `package.json` `engines` |
| **npm** | Repo uses `package-lock.json`; pass `--legacy-peer-deps` when installing |
| **Docker** | Required for integration tests and some samples (MySQL, Mongo, Redis, etc.) |
| **git** | Pull/push; remote is `github.com/nestjs/nest` (contribute via a fork) |
| **GitHub CLI (`gh`)** | Optional but recommended for PRs, issues, and CI status — see [GitHub CLI and contribution workflow](#github-cli-and-contribution-workflow) |

### Install Node.js with nvm

If Node.js is not installed (or you need a supported version), use [nvm](https://github.com/nvm-sh/nvm). These steps work on macOS and Linux; agents can run them for a new developer:

```bash
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 24

# Verify the Node.js version:
node -v # Should print "v24.17.0".

# Verify npm version:
npm -v # Should print "11.13.0".
```

Node **24** satisfies the repo requirement (`>= 20`) and covers samples that need Node **>= 22** (e.g. `sample/35-use-esm-package-after-node22`). Patch versions may differ slightly from the examples above.

---

## GitHub CLI and contribution workflow

Day-to-day git operations (`clone`, `pull`, `push`, branch, commit) only need **git** —
the remote is already configured. The **GitHub CLI (`gh`)** is the recommended tool for
everything that talks to the GitHub API: creating pull requests and issues, checking CI,
and reviewing. It is preferred over a GitHub MCP server here because the Cursor agent
workflows in this repo are built around `gh` shell commands.

### Install `gh`

Homebrew (if available):

```bash
brew install gh
```

No Homebrew? Install the official release binary into `~/.local/bin` (Apple Silicon):

```bash
GH_VERSION=2.95.0
curl -fsSL -o /tmp/gh.zip \
  "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_macOS_arm64.zip"
unzip -oq /tmp/gh.zip -d /tmp
mkdir -p "$HOME/.local/bin"
cp "/tmp/gh_${GH_VERSION}_macOS_arm64/bin/gh" "$HOME/.local/bin/gh"
chmod +x "$HOME/.local/bin/gh"
```

Ensure `~/.local/bin` is on your `PATH` (add to `~/.zshrc` if missing):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

For Intel Macs use `macOS_amd64`; check the latest tag at
<https://github.com/cli/cli/releases>.

### Authenticate (one time)

`gh auth login` opens a browser/device flow, so run it in your own terminal:

```bash
gh auth login      # GitHub.com -> HTTPS -> login with a browser
gh auth status     # verify
```

### Fork-based contribution flow

You cannot push directly to `nestjs/nest`. Fork once, then branch per change:

```bash
gh repo fork nestjs/nest --remote        # adds your fork as a remote
git checkout -b fix/my-change master
# ...edit, then build/test/lint (see Testing below)...
git commit -m "fix(core): ..."           # follow CONTRIBUTING.md commit rules
git push -u origin fix/my-change
gh pr create --fill                       # opens a PR against nestjs:master
```

Common follow-ups:

```bash
gh issue create                           # file a bug / feature request
gh pr status                              # state of your PRs
gh pr checks                              # CI status for the current branch
gh run watch                              # follow a running CI workflow
```

> Commit messages must follow the conventional-commit format enforced by commitlint +
> husky — see [CONTRIBUTING.md](../CONTRIBUTING.md) and the `commit-and-pr` skill.

---

## Quick start

From the repository root:

```bash
npm ci --legacy-peer-deps
npm run build
npm run move:samples

cd sample/01-cats-app
npm install --legacy-peer-deps
npm run start:dev
```

The cats sample listens on **http://localhost:3000**.

---

## Install dependencies

Install root dev dependencies once after cloning:

```bash
npm ci --legacy-peer-deps
```

`npm install --legacy-peer-deps` works as well. The flag matches what CI and gulp sample
tasks use (`tools/gulp/tasks/samples.ts`).

---

## Build the framework packages

### Standard build

```bash
npm run build
```

This runs `tsc -b` over `packages/` and triggers `postbuild`, which copies compiled
output into `node_modules/@nestjs/` at the **repo root** via `gulp move:node_modules`.

### Link built packages into samples

`npm run build` does **not** copy into sample apps. After building (or when you change
framework code and want samples to pick it up), run:

```bash
npm run move:samples
```

This copies compiled `@nestjs/*` packages into each sample's
`node_modules/@nestjs/` directory.

### Watch mode (active framework development)

```bash
npm run build:dev
```

Re-run `npm run move:samples` (or `npm run move:node_modules`) after changes so samples
and tests see the updated build.

### Production build

```bash
npm run build:prod
```

Runs a clean build (`npm run clean` first) and emits compiled `.js` / `.d.ts` next to
source under `packages/`.

---

## Run a sample app

Each numbered directory under `sample/` is a standalone Nest app with its own
`package.json`.

### Single sample (recommended for first run)

```bash
# From repo root — ensure local @nestjs packages are linked
npm run build
npm run move:samples

cd sample/01-cats-app
npm install --legacy-peer-deps
npm run start:dev
```

Common scripts inside a sample:

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Dev server with watch |
| `npm run start:debug` | Debug + watch |
| `npm run build` | Compile the sample |
| `npm run start:prod` | Run compiled `dist/main.js` |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |

### Install dependencies for all samples

From the repo root:

```bash
npx gulp install:samples
```

This runs `npm install --legacy-peer-deps` in every sample directory (skipping samples
that require a newer Node version than you have).

---

## Samples that need extra services

Some samples require Docker or a local database before `npm run start:dev`:

| Sample | Extra setup |
|--------|-------------|
| `05-sql-typeorm`, `07-sequelize` | `docker-compose up` in the sample directory (MySQL) |
| `06-mongoose`, `13-mongo-typeorm`, `14-mongoose-base` | `docker-compose up` (MongoDB) |
| `26-queues` | `docker-compose up` (Redis) |
| `35-use-esm-package-after-node22` | Node.js **>= 22** |

Check each sample's `README.md` for credentials and port details.

---

## Testing

### Unit tests

```bash
npm run test
```

Watch mode:

```bash
npm run test:dev
```

### Lint

```bash
npm run lint
npm run lint:fix   # auto-fix where possible
```

### Integration tests (Docker required)

Integration tests use services defined in `integration/docker-compose.yml` (Redis,
NATS, MQTT, MySQL, PostgreSQL, RabbitMQ, etc.).

Full integration run:

```bash
sh scripts/run-integration.sh
```

That script builds packages, starts Docker services, waits for RabbitMQ, and runs
`npm run test:integration`.

Manual steps:

```bash
npm run build
npm run test:docker:up
npm run test:docker:wait:rmq
npm run test:integration
npm run test:docker:down    # when finished
```

`scripts/prepare.sh` only performs the build + Docker startup + RabbitMQ wait steps —
it does **not** run integration tests and does **not** call `move:samples`.

### Build and test all samples (CI-style, slow)

```bash
npm run build:samples
```

This installs all samples, builds the monorepo, moves packages into samples, builds
every sample, and runs unit + e2e tests across them.

---

## Monorepo layout

```
packages/          @nestjs/* source (common, core, platform-*, microservices, …)
sample/            Example Nest apps (01-cats-app, …)
integration/       Integration test suites + docker-compose.yml
tools/gulp/        Gulp tasks (move:samples, install:samples, …)
scripts/           Shell helpers (prepare.sh, run-integration.sh, …)
```

Packages are managed with [Lerna](https://lerna.js.org/) (`lerna.json` lists
`packages/*`). There is no root `npm start` — run individual samples or tests instead.

---

## Common workflows

### I changed code under `packages/` and want to verify in a sample

```bash
npm run build
npm run move:samples
cd sample/01-cats-app && npm run start:dev
```

### I am fixing a bug with a unit test

1. Add or update a `*.spec.ts` under the relevant `packages/` directory.
2. `npm run test` (or `npm run test:dev` while iterating).
3. `npm run lint` before opening a PR.

### I am preparing a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md): run the full unit suite, integration tests
if your change touches transports or adapters, and follow commit message conventions.

---

## Troubleshooting

**Sample still uses old `@nestjs` behavior after my package change**

Run `npm run build && npm run move:samples` again. Samples resolve `@nestjs/*` from
their local `node_modules/@nestjs/`, not from the root install alone.

**`npm install` peer dependency errors**

Use `--legacy-peer-deps` at the root and in sample directories.

**Integration tests fail to connect to RabbitMQ / Redis / etc.**

Ensure Docker is running, then `npm run test:docker:up` and
`npm run test:docker:wait:rmq` before `npm run test:integration`.

**`prepare.sh` did not set up samples**

Expected — `prepare.sh` builds packages and starts integration-test Docker services.
For sample development use `npm run build` and `npm run move:samples` instead.
