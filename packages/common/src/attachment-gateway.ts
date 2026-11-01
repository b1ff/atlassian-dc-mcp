import { realpathSync } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import { basename, delimiter, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import type { ProductDefinition } from './config/source.js';

/**
 * Operator-controlled gateway that lets the attachment tools read from / write to
 * the local filesystem. It is disabled by default: filesystem access must be
 * explicitly enabled and confined to canonical root directories that the model
 * cannot choose. Configured entirely through environment variables named after
 * the product (e.g. JIRA_ATTACHMENTS_*).
 */
export const DEFAULT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MiB

export interface AttachmentGatewaySide {
  /** Whether this direction (upload/download) is enabled with a valid root. */
  enabled: boolean;
  /** Canonical (realpath-resolved) absolute root directories. */
  roots: string[];
  /** Hard byte limit for a single file in this direction. */
  maxBytes: number;
}

export interface AttachmentGateway {
  upload: AttachmentGatewaySide;
  download: AttachmentGatewaySide;
}

type Env = Record<string, string | undefined>;
type Warn = (message: string) => void;

function envPrefix(product: ProductDefinition): string {
  return product.id.toUpperCase();
}

function readBool(env: Env, name: string): boolean {
  const value = env[name]?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

function readBytes(env: Env, name: string): number | undefined {
  const raw = env[name]?.trim();
  if (!raw || !/^\d+$/.test(raw)) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return parsed > 0 ? parsed : undefined;
}

function readRoots(env: Env, names: string[]): string[] {
  const roots: string[] = [];
  for (const name of names) {
    const raw = env[name];
    if (!raw) {
      continue;
    }
    for (const part of raw.split(delimiter)) {
      const trimmed = part.trim();
      if (trimmed) {
        roots.push(trimmed);
      }
    }
  }
  return roots;
}

function canonicalizeRoots(rawRoots: string[], warn: Warn): string[] {
  const canonical: string[] = [];
  for (const root of rawRoots) {
    if (!isAbsolute(root)) {
      warn(`Ignoring attachment root that is not an absolute path: "${root}"`);
      continue;
    }
    try {
      // .native matches fs/promises.realpath; plain realpathSync yields 8.3 short paths on Windows.
      const real = realpathSync.native(root);
      if (!canonical.includes(real)) {
        canonical.push(real);
      }
    } catch {
      warn(`Ignoring attachment root that does not exist or cannot be resolved: "${root}"`);
    }
  }
  return canonical;
}

function resolveSide(args: {
  enabledFlag: boolean;
  rawRoots: string[];
  maxBytes: number;
  label: string;
  rootEnvHint: string;
  warn: Warn;
}): AttachmentGatewaySide {
  if (!args.enabledFlag) {
    return { enabled: false, roots: [], maxBytes: args.maxBytes };
  }
  const roots = canonicalizeRoots(args.rawRoots, args.warn);
  if (roots.length === 0) {
    args.warn(
      `${args.label} attachments were enabled but no valid directory is configured ` +
        `(set ${args.rootEnvHint}); the ${args.label} tool will stay disabled.`,
    );
    return { enabled: false, roots: [], maxBytes: args.maxBytes };
  }
  return { enabled: true, roots, maxBytes: args.maxBytes };
}

/**
 * Reads the attachment gateway configuration for a product from the environment.
 * Roots are canonicalized once here; a direction is only reported as enabled when
 * its flag is set and at least one valid root resolves.
 */
export function resolveAttachmentGateway(
  product: ProductDefinition,
  options?: { env?: Env; warn?: Warn },
): AttachmentGateway {
  const env = options?.env ?? process.env;
  const warn = options?.warn ?? ((message: string) => console.error(`[attachment-gateway] ${message}`));
  const p = envPrefix(product);

  const exchangeDir = env[`${p}_ATTACHMENTS_DIR`]?.trim();
  const dirRoots = exchangeDir ? [exchangeDir] : [];

  const upload = resolveSide({
    enabledFlag: readBool(env, `${p}_ATTACHMENTS_UPLOAD_ENABLED`),
    rawRoots: [...readRoots(env, [`${p}_ATTACHMENTS_UPLOAD_ROOTS`]), ...dirRoots],
    maxBytes: readBytes(env, `${p}_ATTACHMENTS_MAX_UPLOAD_BYTES`) ?? DEFAULT_MAX_ATTACHMENT_BYTES,
    label: 'upload',
    rootEnvHint: `${p}_ATTACHMENTS_UPLOAD_ROOTS or ${p}_ATTACHMENTS_DIR`,
    warn,
  });

  const download = resolveSide({
    enabledFlag: readBool(env, `${p}_ATTACHMENTS_DOWNLOAD_ENABLED`),
    rawRoots: [...readRoots(env, [`${p}_ATTACHMENTS_DOWNLOAD_ROOTS`]), ...dirRoots],
    maxBytes: readBytes(env, `${p}_ATTACHMENTS_MAX_DOWNLOAD_BYTES`) ?? DEFAULT_MAX_ATTACHMENT_BYTES,
    label: 'download',
    rootEnvHint: `${p}_ATTACHMENTS_DOWNLOAD_ROOTS or ${p}_ATTACHMENTS_DIR`,
    warn,
  });

  return { upload, download };
}

function normalizeRelative(requested: string): string {
  if (!requested || !requested.trim()) {
    throw new Error('A file path is required');
  }
  if (isAbsolute(requested)) {
    throw new Error(`Path must be relative to a configured attachment root, not absolute: "${requested}"`);
  }
  const norm = normalize(requested);
  if (norm === '.' || norm === '..' || norm === '' || norm.startsWith(`..${sep}`) || norm.startsWith('../')) {
    throw new Error(`Path must stay within the configured attachment root: "${requested}"`);
  }
  return norm;
}

function withinRoot(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

/**
 * Canonicalizes the deepest existing ancestor of `target` (resolving symlinked
 * directories) and re-attaches the not-yet-existing tail. Used to confirm a path
 * cannot escape a root through a symlinked parent directory.
 */
async function canonicalizeDeepestExisting(target: string): Promise<string> {
  let current = target;
  while (true) {
    try {
      const real = await realpath(current);
      const tail = relative(current, target);
      return tail ? join(real, tail) : real;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new Error(`Cannot resolve path: "${target}"`);
      }
      current = parent;
    }
  }
}

/**
 * Resolves `requested` (relative) against the allowed roots, returning an absolute
 * path whose parent directory is canonically inside a root. The final path
 * component is NOT symlink-resolved, so callers can still detect a symlinked leaf.
 */
async function resolveLeafWithinRoots(requested: string, roots: string[]): Promise<string> {
  const norm = normalizeRelative(requested);
  for (const root of roots) {
    const lexical = resolve(root, norm);
    if (!withinRoot(lexical, root)) {
      continue;
    }
    const parentReal = await canonicalizeDeepestExisting(dirname(lexical));
    if (withinRoot(parentReal, root)) {
      return join(parentReal, basename(lexical));
    }
  }
  throw new Error(`Path resolves outside the configured attachment root(s): "${requested}"`);
}

/**
 * Resolves and validates a file to upload: it must live inside an allowed upload
 * root, be a regular file (never a symlink or special file), and be within the
 * size limit. Returns the absolute path to read.
 */
export async function resolveUploadSource(params: {
  requestedPath: string;
  side: AttachmentGatewaySide;
}): Promise<{ absolutePath: string; size: number }> {
  if (!params.side.enabled) {
    throw new Error('Attachment upload from the local filesystem is disabled on this server');
  }
  const absolutePath = await resolveLeafWithinRoots(params.requestedPath, params.side.roots);
  const info = await lstat(absolutePath);
  if (info.isSymbolicLink()) {
    throw new Error(`Refusing to upload a symlink: "${params.requestedPath}"`);
  }
  if (!info.isFile()) {
    throw new Error(`Refusing to upload a non-regular file: "${params.requestedPath}"`);
  }
  if (info.size > params.side.maxBytes) {
    throw new Error(
      `File size ${info.size} bytes exceeds the configured upload limit of ${params.side.maxBytes} bytes`,
    );
  }
  return { absolutePath, size: info.size };
}

/**
 * Resolves a destination path to save a downloaded attachment into. The file is
 * placed in the first configured download root; the caller writes with an
 * exclusive flag so existing files (including symlinks) are never overwritten.
 */
export async function resolveDownloadDestination(params: {
  requestedName: string;
  side: AttachmentGatewaySide;
}): Promise<string> {
  if (!params.side.enabled) {
    throw new Error('Saving attachments to the local filesystem is disabled on this server');
  }
  const safeName = basename(params.requestedName);
  if (!safeName || safeName === '.' || safeName === '..') {
    throw new Error(`Invalid attachment file name: "${params.requestedName}"`);
  }
  return resolveLeafWithinRoots(safeName, [params.side.roots[0]]);
}

/** Resolves a path within roots, throwing if it escapes. Exported for verification/tests. */
export async function assertWithinRoots(requested: string, roots: string[]): Promise<string> {
  return resolveLeafWithinRoots(requested, roots);
}
