// Merge porcelain (deck slide 26): fast-forward, true merges, conflicts.

import { headTree, resolveRev, isAncestor, mergeBase, commitNow } from './commits.js';
import { needRepo } from './gitA.js';
import { checkoutTree } from './gitD.js';

export function threeWayMerge(S, base, ours, theirs) {
  const conflicts = {};
  const merged = {};
  const paths = new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]);
  for (const p of paths) {
    const b = p in base ? base[p] : undefined;
    const o = p in ours ? ours[p] : undefined;
    const t = p in theirs ? theirs[p] : undefined;
    if (o === t) {
      if (o !== undefined) merged[p] = o;
    } else if (b === o) {
      if (t !== undefined) merged[p] = t;
    } else if (b === t) {
      if (o !== undefined) merged[p] = o;
    } else {
      conflicts[p] = true;
      const oTxt = o === undefined ? '' : o;
      const tTxt = t === undefined ? '' : t;
      merged[p] = `<<<<<<< HEAD\n${oTxt}\n=======\n${tTxt}\n>>>>>>> incoming\n`;
    }
  }
  return { merged, conflicts };
}

export function cmdMerge(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const nonFlag = args.filter((a) => !a.startsWith('-'));
  if (args.includes('--abort')) {
    if (!r.mergeHead) {
      out.push({ text: 'fatal: there is no merge to abort.', cls: 'err' });
      return;
    }
    checkoutAbortMerge(S);
    out.push({ text: 'Merge aborted — back to the pre-merge state.', cls: 'ok' });
    return;
  }
  if (!nonFlag.length) {
    out.push({ text: 'usage: git merge <branch>   (run it from the branch that should receive the changes)', cls: 'err' });
    return;
  }
  if (r.head.type !== 'branch') {
    out.push({ text: 'fatal: merging on a detached HEAD is disabled in this game — switch to a branch first.', cls: 'err' });
    return;
  }
  if (r.conflicts && Object.keys(r.conflicts).length) {
    out.push({ text: 'error: Merging is not possible because you have unmerged files.', cls: 'err' });
    return;
  }
  const name = nonFlag[0];
  let theirSha = null;
  if (name in r.branches) theirSha = r.branches[name];
  else if (r.remotes[name.split('/')[0]]) theirSha = resolveRev(S, name);
  else theirSha = resolveRev(S, name);
  if (!theirSha || !r.commits[theirSha]) {
    out.push({ text: `error: branch '${name}' not found.`, cls: 'err' });
    return;
  }
  const cur = r.head.name;
  const ourSha = r.branches[cur];
  if (theirSha === ourSha) {
    out.push({ text: 'Already up to date.', cls: 'dim' });
    return;
  }
  if (isAncestor(S, theirSha, ourSha)) {
    out.push({ text: 'Already up to date.', cls: 'dim' });
    return;
  }
  // Fast-forward: our tip is an ancestor of theirs
  if (!ourSha || isAncestor(S, ourSha, theirSha)) {
    const target = r.commits[theirSha].tree;
    try {
      checkoutTree(S, target);
    } catch (e) {
      out.push({ text: e.message, cls: 'err' });
      return;
    }
    r.branches[cur] = theirSha;
    out.push({ text: `Updating ${ourSha ? ourSha.slice(0, 7) : '0000000'}..${theirSha.slice(0, 7)}`, cls: 'out' });
    out.push({ text: 'Fast-forward — no new commit needed: our tip was an ancestor of theirs.', cls: 'ok' });
    return;
  }
  // True merge via common base
  const baseSha = mergeBase(S, ourSha, theirSha);
  const base = baseSha ? r.commits[baseSha].tree : {};
  const ours = r.commits[ourSha].tree;
  const theirs = r.commits[theirSha].tree;
  const { merged, conflicts } = threeWayMerge(S, base, ours, theirs);
  const names = Object.keys(conflicts);
  if (names.length) {
    for (const p of names) {
      const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
      S.files.set(abs, merged[p]);
      r.index[p] = merged[p];
    }
    r.conflicts = conflicts;
    r.mergeHead = theirSha;
    out.push({ text: `Auto-merging with common base ${baseSha.slice(0, 7)} — CONFLICT in: ${names.join(', ')}`, cls: 'err' });
    out.push({ text: 'Automatic merge failed; fix conflicts and then commit the result.', cls: 'warn' });
    out.push({ text: 'hint: open the file (cat it), keep the lines you want, git add it, git commit.', cls: 'dim' });
    return;
  }
  const otherName = name.includes('/') ? name : name;
  const msg = args.includes('-m') ? args[args.indexOf('-m') + 1] : `Merge branch '${otherName}' into ${cur}`;
  const sha = commitNow(S, msg, [ourSha, theirSha], merged);
  for (const p of Object.keys(merged)) {
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    S.files.set(abs, merged[p]);
  }
  out.push({ text: `Merge made by the 'game' strategy, common base ${baseSha.slice(0, 7)}.`, cls: 'out' });
  out.push({ text: `[${cur} ${sha.slice(0, 7)}] ${msg}`, cls: 'ok' });
}

function checkoutAbortMerge(S) {
  const r = S.repo;
  const head = headTree(S);
  for (const p of Object.keys(r.index)) {
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    if (p in head) S.files.set(abs, head[p]);
    else if (S.files.has(abs)) S.files.delete(abs);
  }
  r.index = {};
  r.conflicts = null;
  r.mergeHead = null;
}

