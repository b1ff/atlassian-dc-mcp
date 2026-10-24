import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { CommentDraftStore } from '../jira-draft-store.js';

let dir: string;
let store: CommentDraftStore;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'jira-drafts-'));
  store = new CommentDraftStore(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('CommentDraftStore', () => {
  it('creates a draft and lists it', async () => {
    const draft = await store.save('PROJ-1', 'first draft');
    assert.match(draft.id, /^[\w-]+$/);
    assert.equal(draft.issueKey, 'PROJ-1');
    const all = await store.list();
    assert.equal(all.length, 1);
    assert.equal(all[0].comment, 'first draft');
  });

  it('updates an existing draft by id, keeping createdAt', async () => {
    const created = await store.save('PROJ-1', 'v1');
    const updated = await store.save('PROJ-1', 'v2', created.id);
    assert.equal(updated.id, created.id);
    assert.equal(updated.comment, 'v2');
    assert.equal(updated.createdAt, created.createdAt);
    assert.ok(updated.updatedAt >= created.updatedAt);
    assert.equal((await store.list()).length, 1);
  });

  it('filters listings by issue key', async () => {
    await store.save('PROJ-1', 'a');
    await store.save('PROJ-2', 'b');
    const only = await store.list('PROJ-2');
    assert.equal(only.length, 1);
    assert.equal(only[0].issueKey, 'PROJ-2');
  });

  it('round-trips through JSON on disk', async () => {
    const draft = await store.save('PROJ-9', 'persisted');
    const raw = await readFile(path.join(dir, `${draft.id}.json`), 'utf-8');
    assert.equal(JSON.parse(raw).comment, 'persisted');
    assert.equal((await store.get(draft.id)).comment, 'persisted');
  });

  it('deletes a draft', async () => {
    const draft = await store.save('PROJ-1', 'gone soon');
    const removed = await store.delete(draft.id);
    assert.equal(removed.id, draft.id);
    await assert.rejects(store.get(draft.id), /not found/i);
  });

  it('rejects unsafe ids (path traversal)', async () => {
    await assert.rejects(store.get('../escape'), /Draft id/);
    await assert.rejects(store.save('PROJ-1', 'x', '../../etc/passwd'), /Draft id/);
  });

  it('returns empty list when the directory does not exist', async () => {
    const empty = new CommentDraftStore(path.join(dir, 'missing'));
    assert.deepEqual(await empty.list(), []);
  });
});
