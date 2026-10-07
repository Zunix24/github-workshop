// Staging-area model: workTree() + statusOf().

import { under, relOf } from './state.js';
import { headTree } from './commits.js';

// relPath -> content, restricted to repo root
export function workTree(S) {
  const out = {};
  if (!S.repo) return out;
  for (const [abs, content] of S.files) {
    if (under(S.repo.root, abs)) out[relOf(S.repo.root, abs)] = content;
  }
  return out;
}

export function statusOf(S) {
  const st = { staged: [], unstaged: [], untracked: [], conflicted: [] };
  if (!S.repo) return st;
  const head = headTree(S);
  const idx = S.repo.index;
  const work = workTree(S);
  for (const p of Object.keys(idx)) {
    const hv = p in head ? head[p] : undefined;
    const iv = idx[p]; // null = staged deletion
    if (iv === hv) continue;
    if (hv === undefined) st.staged.push({ path: p, kind: 'A' });
    else if (iv === null) st.staged.push({ path: p, kind: 'D' });
    else st.staged.push({ path: p, kind: 'M' });
  }
  const tracked = new Set([...Object.keys(head), ...Object.keys(idx).filter((p) => idx[p] !== null)]);
  for (const p of tracked) {
    const base = p in idx ? idx[p] : head[p];
    const wv = p in work ? work[p] : undefined;
    if (wv === base) continue;
    if (wv === undefined) st.unstaged.push({ path: p, kind: 'D' });
    else if (base === undefined) st.unstaged.push({ path: p, kind: 'A' });
    else st.unstaged.push({ path: p, kind: 'M' });
  }
  for (const p of Object.keys(work)) {
    if (!(p in head) && !(p in idx)) st.untracked.push({ path: p, kind: '?' });
  }
  if (S.repo.conflicts) {
    for (const p of Object.keys(S.repo.conflicts)) st.conflicted.push({ path: p, kind: 'U' });
  }
  const sort = (x, y) => (x.path < y.path ? -1 : 1);
  st.staged.sort(sort);
  st.unstaged.sort(sort);
  st.untracked.sort(sort);
  st.conflicted.sort(sort);
  return st;
}
