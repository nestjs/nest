import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const LOCAL_ENV_FILES = ['.env.local', '.env'];

function trimEnvValue(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed[trimmed.length - 1] === quote) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadLocalEnvFiles(): void {
  for (const fileName of LOCAL_ENV_FILES) {
    const envPath = join(process.cwd(), fileName);

    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) {
        continue;
      }

      process.env[key] = trimEnvValue(line.slice(separatorIndex + 1));
    }
  }
}

loadLocalEnvFiles();

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1';
}

export function isDatabaseEnabled(): boolean {
  const disabled = process.env.DISABLE_DATABASE === 'true' || process.env.DATABASE_DISABLED === 'true';
  return !disabled && Boolean(process.env.MONGODB_URI?.trim());
}

export function getRuntimeStatus() {
  const databaseEnabled = isDatabaseEnabled();

  return {
    database: databaseEnabled ? 'enabled' : 'disabled',
    databaseReason: databaseEnabled
      ? 'MONGODB_URI is configured'
      : 'Set MONGODB_URI in Vercel environment variables to enable database-backed APIs',
    vercel: isVercelRuntime(),
  };
}

export function getLogsDir(): string {
  return isVercelRuntime() ? '/tmp/logs' : join(process.cwd(), 'logs');
}

export function getPublicPath(): string {
  const candidates = [
    join(process.cwd(), 'public'),
    join(__dirname, '..', 'public'),
    join(__dirname, '..', '..', 'public'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}
