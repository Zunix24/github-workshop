// Rebase porcelain (deck slide 27): replay commits for a linear history.

import { resolveRev, isAncestor, mergeBase, tick, nextSha } from './commits.js';
import { needRepo } from './gitA.js';
import { threeWayMerge } from './gitH.js';

function commitsBetween(S, base, tip) {
  const out = [];
  let sha = tip;
  const guard = new Set();
  while (sha && sha !== base && !guard.has(sha)) {
    guard.add(sha);
    const c = S.repo.commits[sha];
    if (!c) break;
    out.push(c);
    sha = c.parents[0] || null;
  }
  return sha === base ? out.reverse() : null;
}


function doReplayStep(S, out) {
  const r = S.repo;
  const rb = r.rebase;
  const step = rb.todo[0];
  const ontoTree = r.commits[rb.ontoTip].tree;
  const { merged, conflicts } = threeWayMerge(S, step.parentTree, step.tree, ontoTree);
  const names = Object.keys(conflicts);
  if (names.length) {
    for (const p of names) {
      const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
      S.files.set(abs, merged[p]);
      r.index[p] = merged[p];
    }
    r.conflicts = conflicts;
    out.push({ text: `CONFLICT in ${names.join(', ')} while replaying "${step.message}".`, cls: 'err' });
    out.push({ text: 'Resolve it (edit file, git add), then  git rebase --continue  — or  git rebase --abort.', cls: 'warn' });
    return;
  }
  const time = tick(S).toISOString();
  const sha = nextSha(S);
  r.commits[sha] = {
    sha, parents: [rb.ontoTip], message: step.message,
    author: r.user.name, email: r.user.email, time, tree: { ...merged },
  };
  rb.ontoTip = sha;
  rb.done.push(sha);
  rb.todo.shift();
  for (const p of Object.keys(merged)) {
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    S.files.set(abs, merged[p]);
  }
  r.index = {};
  if (!rb.todo.length) finishRebase(S, out);
  else doReplayStep(S, out);
}

function finishRebase(S, out) {
  const r = S.repo;
  const branch = r.rebase.branch;
  r.branches[branch] = r.rebase.ontoTip;
  r.head = { type: 'branch', name: branch };
  r.rebase = null;
  out.push({ text: `Successfully rebased ${branch} — history is now linear, no merge commit.`, cls: 'ok' });
}


function replayCommit(S, message, parent, tree) {
  const r = S.repo;
  const time = tick(S).toISOString();
  const sha = nextSha(S);
  r.commits[sha] = { sha, parents: [parent], message, author: r.user.name, email: r.user.email, time, tree: { ...tree } };
  for (const p of Object.keys(tree)) {
    const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
    S.files.set(abs, tree[p]);
  }
  return sha;
}

export function cmdRebase(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const nonFlag = args.filter((a) => !a.startsWith('-') && a !== '--');

  if (args.includes('--abort')) {
    if (!r.rebase) {
      out.push({ text: 'fatal: no rebase in progress.', cls: 'err' });
      return;
    }
    r.branches[r.rebase.branch] = r.rebase.origTip;
    r.head = { type: 'branch', name: r.rebase.branch };
    const back = r.commits[r.rebase.origTip].tree;
    for (const p of Object.keys(back)) {
      const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
      S.files.set(abs, back[p]);
    }
    r.index = {};
    r.conflicts = null;
    r.rebase = null;
    out.push({ text: 'Rebase aborted — branch restored to its original tip.', cls: 'ok' });
    return;
  }
  if (args.includes('--skip')) {
    if (!r.rebase || !r.rebase.todo.length) {
      out.push({ text: 'fatal: no rebase step to skip.', cls: 'err' });
      return;
    }
    r.rebase.todo.shift();
    r.conflicts = null;
    if (!r.rebase.todo.length) finishRebase(S, out);
    else doReplayStep(S, out);
    return;
  }
  if (args.includes('--continue')) {
    if (!r.rebase) {
      out.push({ text: 'fatal: no rebase in progress.', cls: 'err' });
      return;
    }
    if (r.conflicts && Object.keys(r.conflicts).length) {
      out.push({ text: 'error: resolve conflicts (git add the fixed files) before continuing.', cls: 'err' });
      return;
    }
    // Include the player's resolutions in the replayed commit.
    const rb = r.rebase;
    const step = rb.todo[0];
    const ontoTree = r.commits[rb.ontoTip].tree;
    const work = {};
    for (const [abs, c] of S.files) {
      if (r.root === '/' || abs === r.root || abs.startsWith(`${r.root}/`)) {
        work[r.root === '/' ? abs.slice(1) : abs.slice(r.root.length + 1)] = c;
      }
    }
    const again = threeWayMerge(S, step.parentTree, work, ontoTree);
    if (Object.keys(again.conflicts).length) {
      r.conflicts = again.conflicts;
      out.push({ text: 'Still conflicting — keep editing, git add, then continue again.', cls: 'err' });
      return;
    }
    const sha = replayCommit(S, step.message, rb.ontoTip, again.merged);
    rb.ontoTip = sha;
    rb.todo.shift();
    r.index = {};
    if (!rb.todo.length) finishRebase(S, out);
    else doReplayStep(S, out);
    return;
  }
  if (!nonFlag.length) {
    out.push({ text: 'usage: git rebase <upstream-branch>  (run from the branch to move)', cls: 'err' });
    return;
  }
  if (r.head.type !== 'branch') {
    out.push({ text: 'fatal: cannot rebase a detached HEAD in this game.', cls: 'err' });
    return;
  }
  if (r.rebase) {
    out.push({ text: 'fatal: a rebase is already in progress (--continue / --abort).', cls: 'err' });
    return;
  }
  const upName = nonFlag[0];
  const upSha = resolveRev(S, upName);
  if (!upSha || !r.commits[upSha]) {
    out.push({ text: `error: upstream branch '${upName}' not found.`, cls: 'err' });
    return;
  }
  const branch = r.head.name;
  const tip = r.branches[branch];
  if (!tip) {
    out.push({ text: `fatal: branch '${branch}' has no commits to rebase.`, cls: 'err' });
    return;
  }
  if (upSha === tip || isAncestor(S, tip, upSha)) {
    out.push({ text: `Current branch ${branch} is up to date with ${upName} — nothing to replay.`, cls: 'dim' });
    return;
  }
  const base = mergeBase(S, tip, upSha);
  const picks = commitsBetween(S, base, tip);
  if (!picks) {
    out.push({ text: 'fatal: cannot rebase across merges in this game — merge instead.', cls: 'err' });
    return;
  }
  if (!picks.length) {
    out.push({ text: 'Nothing to replay — already linear.', cls: 'dim' });
    return;
  }
  r.rebase = {
    branch, origTip: tip, ontoTip: upSha,
    todo: picks.map((c) => ({
      message: c.message,
      tree: c.tree,
      parentTree: c.parents.length ? r.commits[c.parents[0]].tree : {},
    })),
    done: [],
    pausedForEdit: false,
  };
  out.push({ text: `Rebasing ${branch} onto ${upName}: replaying ${picks.length} commit${picks.length === 1 ? '' : 's'}...`, cls: 'out' });
  doReplayStep(S, out);
}
