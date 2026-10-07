// Read-only porcelain, part 2: diff.

import { norm, under, relOf } from './state.js';
import { headTree, resolveRev } from './commits.js';
import { workTree } from './stage.js';
import { needRepo } from './gitA.js';
import { formatFileDiff } from './diff.js';

export function cmdDiff(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const staged = args.includes('--staged') || args.includes('--cached');
  const nonFlag = args.filter((a) => !a.startsWith('-'));
  const head = headTree(S);
  const work = workTree(S);
  const idx = S.repo.index;

  const emit = (path, oldV, newV) => {
    if (oldV === newV) return false;
    for (const l of formatFileDiff(path, oldV, newV)) {
      const cls = l.startsWith('+') && !l.startsWith('+++') ? 'add' : l.startsWith('-') && !l.startsWith('---') ? 'del' : 'dim';
      out.push({ text: l, cls });
    }
    return true;
  };

  // git diff <revA> <revB>
  if (nonFlag.length >= 2) {
    const a = resolveRev(S, nonFlag[0]);
    const b = resolveRev(S, nonFlag[1]);
    if (!a || !S.repo.commits[a]) {
      out.push({ text: `fatal: bad revision '${nonFlag[0]}'`, cls: 'err' });
      return;
    }
    if (!b || !S.repo.commits[b]) {
      out.push({ text: `fatal: bad revision '${nonFlag[1]}'`, cls: 'err' });
      return;
    }
    const ta = S.repo.commits[a].tree;
    const tb = S.repo.commits[b].tree;
    let any = false;
    for (const p of new Set([...Object.keys(ta), ...Object.keys(tb)])) any = emit(p, ta[p], tb[p]) || any;
    if (!any) out.push({ text: 'No differences.', cls: 'dim' });
    return;
  }

  // optional single path filter
  let paths = null;
  if (nonFlag.length === 1) {
    const abs = norm(S.cwd, nonFlag[0]);
    if (!under(S.repo.root, abs)) {
      out.push({ text: `fatal: ${nonFlag[0]}: outside repository`, cls: 'err' });
      return;
    }
    paths = [relOf(S.repo.root, abs)];
  }

  if (staged) {
    const keys = new Set([...Object.keys(head), ...Object.keys(idx)]);
    let any = false;
    for (const p of keys) {
      if (paths && !paths.includes(p)) continue;
      any = emit(p, head[p], p in idx ? idx[p] ?? undefined : head[p]) || any;
    }
    if (!any) out.push({ text: 'No staged changes.', cls: 'dim' });
    return;
  }
  const keys = new Set([...Object.keys(idx).length ? Object.keys(idx) : Object.keys(head), ...Object.keys(work)]);
  const baseOf = (p) => (p in idx ? idx[p] ?? undefined : head[p]);
  let any = false;
  for (const p of keys) {
    if (paths && !paths.includes(p)) continue;
    any = emit(p, baseOf(p), work[p]) || any;
  }
  if (!any) out.push({ text: 'No working-tree changes.', cls: 'dim' });
}
