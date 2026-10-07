// Core porcelain, part 4: restore (+checkoutTree helper).

import { norm, under, relOf } from './state.js';
import { headTree, resolveRev } from './commits.js';
import { needRepo } from './gitA.js';

// Switch working tree + index to <target> tree, refusing when local edits
// would be overwritten. Throws Error with a git-style message.
export function checkoutTree(S, target) {
  const r = S.repo;
  const head = headTree(S);
  const keys = new Set([...Object.keys(head), ...Object.keys(target)]);
  for (const p of keys) {
    const hv = p in head ? head[p] : undefined;
    const tv = p in target ? target[p] : undefined;
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    const wv = S.files.has(abs) ? S.files.get(abs) : undefined;
    if (wv === hv) {
      if (tv === undefined) S.files.delete(abs);
      else S.files.set(abs, tv);
    } else if (wv === tv || hv === tv) {
      // already matches target, or unchanged between trees: keep local edit
    } else {
      throw new Error(
        `error: Your local changes to the following files would be overwritten by checkout:\n\t${p}\nPlease commit your changes or stash them before you switch branches.\nAborting`,
      );
    }
  }
  r.index = {};
  r.conflicts = null;
  r.mergeHead = null;
}

export function cmdRestore(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const staged = args.includes('--staged');
  let source = null;
  const paths = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--source=')) source = a.slice('--source='.length);
    else if (a === '--source' && i + 1 < args.length) {
      source = args[i + 1];
      i += 1;
    } else if (!a.startsWith('-') && a !== '--') paths.push(a);
  }
  if (!paths.length) {
    out.push({ text: 'usage: git restore --staged <file>  |  git restore <file>  |  git restore --source=<rev> <file>', cls: 'err' });
    return;
  }
  const head = headTree(S);
  let srcTree = null;
  if (source) {
    const s = resolveRev(S, source);
    if (!s || !r.commits[s]) {
      out.push({ text: `fatal: bad revision '${source}'`, cls: 'err' });
      return;
    }
    srcTree = r.commits[s].tree;
  }
  for (const t of paths) {
    const abs = norm(S.cwd, t);
    if (!under(r.root, abs)) {
      out.push({ text: `fatal: ${t}: outside repository`, cls: 'err' });
      return;
    }
    const rel = relOf(r.root, abs);
    if (staged) {
      if (rel in head) r.index[rel] = head[rel];
      else delete r.index[rel];
      out.push({ text: `Unstaged ${rel} — index now matches HEAD.`, cls: 'ok' });
    } else if (srcTree) {
      if (rel in srcTree) {
        S.files.set(abs, srcTree[rel]);
        out.push({ text: `Restored ${rel} from ${source}.`, cls: 'ok' });
      } else {
        out.push({ text: `fatal: pathspec '${t}' did not match any file in ${source}`, cls: 'err' });
      }
    } else {
      const base = rel in r.index ? r.index[rel] : head[rel];
      if (base === undefined || base === null) {
        if (S.files.has(abs)) S.files.delete(abs);
      } else S.files.set(abs, base);
      out.push({ text: `Discarded working-tree changes in ${rel}.`, cls: 'ok' });
    }
  }
}
