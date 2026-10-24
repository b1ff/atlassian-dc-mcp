import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';

export interface CommentDraft {
  id: string;
  issueKey: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_DRAFTS_DIR = path.join(homedir(), '.atlassian-dc-mcp', 'jira-drafts');

/**
 * Local, file-based storage for Jira comment drafts.
 *
 * Jira Data Center has no server-side draft comments API, so drafts are kept
 * on the client machine and never sent to Jira until the user deliberately
 * posts them (e.g. via jira_postIssueComment).
 */
export class CommentDraftStore {
  private readonly dir: string;

  constructor(dir: string = process.env.JIRA_DRAFTS_DIR || DEFAULT_DRAFTS_DIR) {
    this.dir = dir;
  }

  async save(issueKey: string, comment: string, id?: string): Promise<CommentDraft> {
    if (!id) {
      id = randomUUID();
    }
    this.assertSafeId(id);
    if (!issueKey.trim()) {
      throw new Error('issueKey must not be empty');
    }
    await mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    let draft: CommentDraft;
    const existing = await this.get(id).catch(() => undefined);
    if (existing) {
      draft = { ...existing, issueKey, comment, updatedAt: now };
    } else {
      draft = { id, issueKey, comment, createdAt: now, updatedAt: now };
    }
    const file = this.fileFor(id);
    const tmp = `${file}.tmp-${Date.now()}`;
    await writeFile(tmp, JSON.stringify(draft, null, 2), 'utf-8');
    await rename(tmp, file);
    return draft;
  }

  async list(issueKey?: string): Promise<CommentDraft[]> {
    let entries: string[];
    try {
      entries = await readdir(this.dir);
    } catch {
      return [];
    }
    const drafts: CommentDraft[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }
      const raw = await readFile(path.join(this.dir, entry), 'utf-8');
      try {
        const draft = JSON.parse(raw) as CommentDraft;
        if (!issueKey || draft.issueKey === issueKey) {
          drafts.push(draft);
        }
      } catch {
        // skip unreadable files rather than failing the listing
      }
    }
    drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return drafts;
  }

  async get(id: string): Promise<CommentDraft> {
    this.assertSafeId(id);
    let raw: string;
    try {
      raw = await readFile(this.fileFor(id), 'utf-8');
    } catch {
      throw new Error(`Draft not found: ${id}`);
    }
    return JSON.parse(raw) as CommentDraft;
  }

  async delete(id: string): Promise<CommentDraft> {
    const draft = await this.get(id);
    await rm(this.fileFor(id), { force: true });
    return draft;
  }

  private fileFor(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  private assertSafeId(id: string): void {
    if (!/^[\w-]{1,128}$/.test(id)) {
      throw new Error('Draft id must be alphanumeric, dash or underscore');
    }
  }
}
