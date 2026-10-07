// Remote porcelain, part 2: fetch + pull (fetch + merge, deck slide 28).

import { headTree, isAncestor, mergeBase, commitNow } from './commits.js';
import { needRepo } from './gitA.js';
import { checkoutTree } from './gitD.js';
import { threeWayMerge } from './gitH.js';
import { remoteStore } from './gitJ.js';

export function doFetch(S, remoteName, ctx, out, quiet) {
  const r = S.repo;
  const cfg = r.remotes[remoteName];
  if (!cfg) {
    out.push({ text: `fatal: '${remoteName}' does not appear to be a git repository`, cls: 'err' });
    return false;
  }
  const store = remoteStore(ctx);
  const R = store[cfg.url];
  if (!R) {
    out.push({ text: `fatal: repository '${cfg.url}' not found in this simulated world.`, cls: 'err' });
    return false;
  }
  for (const [sha, c] of Object.entries(R.commits)) {
    if (!S.repo.commits[sha]) S.repo.commits[sha] = JSON.parse(JSON.stringify(c));
  }
  r.fetched = r.fetched || {};
  let changed = false;
  for (const b of Object.keys(R.branches)) {
    const ref = `${remoteName}/${b}`;
    if (r.fetched[ref] !== R.branches[b]) {
      r.fetched[ref] = R.branches[b];
      changed = true;
    }
  }
  if (!quiet) {
    if (changed) out.push({ text: `Fetched from ${remoteName}: ${Object.keys(R.branches).map((b) => `${remoteName}/${b}`).join(', ')}`, cls: 'ok' });
    else out.push({ text: `Already up to date with ${remoteName}.`, cls: 'dim' });
  }
  return true;
}

export function cmdFetch(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const name = args.find((a) => !a.startsWith('-')) || 'origin';
  doFetch(S, name, ctx, out, false);
}

export function cmdPull(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  if (r.head.type !== 'branch') {
    out.push({ text: 'fatal: pulling on a detached HEAD is disabled — switch to a branch first.', cls: 'err' });
    return;
  }
  void headTree;
  const nonFlag = args.filter((a) => !a.startsWith('-') && a !== '--');
  let remoteName = nonFlag[0] || Object.keys(r.remotes)[0] || 'origin';
  let branchName = nonFlag[1] || r.head.name;
  if (!r.remotes[remoteName] && r.remotes.origin) {
    branchName = nonFlag[0] || r.head.name;
    remoteName = 'origin';
  }
  if (!doFetch(S, remoteName, ctx, out, true)) return;
  const ref = `${remoteName}/${branchName}`;
  const theirSha = (r.fetched && r.fetched[ref]) ?? null;
  if (!theirSha || !r.commits[theirSha]) {
    out.push({ text: `fatal: couldn't find remote ref ${ref}`, cls: 'err' });
    return;
  }
  const cur = r.head.name;
  const ourSha = r.branches[cur];
  if (theirSha === ourSha || (ourSha && isAncestor(S, theirSha, ourSha))) {
    out.push({ text: 'Already up to date.', cls: 'dim' });
    return;
  }
  if (!ourSha || isAncestor(S, ourSha, theirSha)) {
    try {
      checkoutTree(S, r.commits[theirSha].tree);
    } catch (e) {
      out.push({ text: e.message, cls: 'err' });
      return;
    }
    r.branches[cur] = theirSha;
    r.upstream[cur] = ref;
    out.push({ text: `Fast-forwarded ${cur} to ${ref} (${theirSha.slice(0, 7)}). Workspace synced.`, cls: 'ok' });
    return;
  }
  out.push({ text: `Merging ${ref} into ${cur}...`, cls: 'out' });
  const bSha = mergeBase(S, ourSha, theirSha);
  const merged = threeWayMerge(S, bSha ? r.commits[bSha].tree : {}, r.commits[ourSha].tree, r.commits[theirSha].tree);
  const names = Object.keys(merged.conflicts);
  if (names.length) {
    for (const p of names) {
      const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
      S.files.set(abs, merged.merged[p]);
      r.index[p] = merged.merged[p];
    }
    r.conflicts = merged.conflicts;
    r.mergeHead = theirSha;
    out.push({ text: `CONFLICT in: ${names.join(', ')} — fix, git add, git commit to finish the pull.`, cls: 'err' });
    return;
  }
  const msg = `Merge remote-tracking branch '${ref}' into ${cur}`;
  const sha = commitNow(S, msg, [ourSha, theirSha], merged.merged);
  for (const p of Object.keys(merged.merged)) {
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    S.files.set(abs, merged.merged[p]);
  }
  r.upstream[cur] = ref;
  out.push({ text: `[${cur} ${sha.slice(0, 7)}] ${msg}`, cls: 'ok' });
}
