// Core porcelain, part 3: commit + revert + restore.

import { ensureDir } from './state.js';
import { headSha, headTree, resolveRev, commitNow } from './commits.js';
import { needRepo } from './gitA.js';

export function cmdCommit(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  if (r.rebase && !r.rebase.pausedForEdit) {
    out.push({ text: 'fatal: you are in the middle of a rebase — resolve conflicts first.', cls: 'err' });
    return;
  }
  let m = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '-m' && i + 1 < args.length) m = args[i + 1];
    else if (args[i].startsWith('-m') && args[i].length > 2) m = args[i].slice(2);
  }
  if (!m) {
    out.push({ text: 'hint: an editor would open here IRL — this game needs  git commit -m "message"', cls: 'err' });
    return;
  }
  const head = headTree(S);
  const tree = { ...head };
  for (const p of Object.keys(r.index)) {
    if (r.index[p] === null) delete tree[p];
    else tree[p] = r.index[p];
  }
  if (JSON.stringify(tree) === JSON.stringify(head) && !r.mergeHead) {
    out.push({ text: 'nothing to commit, working tree clean', cls: 'out' });
    return;
  }
  if (r.conflicts && Object.keys(r.conflicts).length) {
    out.push({ text: 'error: committing is not possible because you have unmerged files.', cls: 'err' });
    out.push({ text: 'hint: fix them in the work tree, then use \'git add\' to mark resolution.', cls: 'dim' });
    return;
  }
  if (r.rebase && r.rebase.pausedForEdit) {
    const rb = r.rebase;
    const sha2 = commitNow(S, m, [rb.ontoTip], tree);
    void sha2;
    out.push({ text: `[detached HEAD ${String(headSha(S)).slice(0, 7)}] ${m}`, cls: 'out' });
    return;
  }
  const parents = [];
  if (r.head.type === 'branch') {
    const tip = r.branches[r.head.name];
    if (tip) parents.push(tip);
  } else {
    const d = headSha(S);
    if (d) parents.push(d);
  }
  if (r.mergeHead) parents.push(r.mergeHead);
  const sha = commitNow(S, m, parents, tree);
  r.mergeHead = null;
  const branch = r.head.type === 'branch' ? r.head.name : 'detached HEAD';
  out.push({ text: `[${branch} ${sha.slice(0, 7)}] ${m}`, cls: 'ok' });
}

export function cmdRevert(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const noCommit = args.includes('-n') || args.includes('--no-commit');
  let rev = 'HEAD';
  for (const a of args) {
    if (!a.startsWith('-')) rev = a;
  }
  const sha = resolveRev(S, rev);
  if (!sha) {
    out.push({ text: `fatal: bad revision '${rev}'`, cls: 'err' });
    return;
  }
  const c = r.commits[sha];
  if (!c.parents.length) {
    out.push({ text: 'fatal: the initial commit has no parent to restore — nothing to revert to.', cls: 'err' });
    return;
  }
  const parent = r.commits[c.parents[0]];
  const paths = new Set([...Object.keys(parent.tree), ...Object.keys(c.tree)]);
  let touched = 0;
  for (const p of paths) {
    const pv = p in parent.tree ? parent.tree[p] : undefined;
    const cv = p in c.tree ? c.tree[p] : undefined;
    if (pv === cv) continue;
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    if (pv === undefined) {
      if (S.files.has(abs)) S.files.delete(abs);
      r.index[p] = null;
    } else {
      S.files.set(abs, pv);
      ensureDir(S, abs.slice(0, abs.lastIndexOf('/')) || '/');
      r.index[p] = pv;
    }
    touched += 1;
  }
  if (!touched) {
    out.push({ text: 'nothing to revert — that commit changed no files.', cls: 'dim' });
    return;
  }
  if (noCommit) {
    out.push({ text: `Reverted ${rev} into the staging area (no commit created). Review with git status, then commit.`, cls: 'ok' });
    return;
  }
  const msg = `Revert "${c.message}"`;
  const tip = headSha(S);
  const tree = { ...headTree(S) };
  for (const p of Object.keys(r.index)) {
    if (r.index[p] === null) delete tree[p];
    else tree[p] = r.index[p];
  }
  const ns = commitNow(S, msg, tip ? [tip] : [], tree);
  const branch = r.head.type === 'branch' ? r.head.name : 'HEAD';
  out.push({ text: `[${branch} ${ns.slice(0, 7)}] ${msg}`, cls: 'ok' });
  out.push({ text: `Restored ${touched} file${touched === 1 ? '' : 's'} to the pre-${sha.slice(0, 7)} state. History kept — nothing rewritten.`, cls: 'dim' });
}
