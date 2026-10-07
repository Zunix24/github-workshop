// Remote porcelain, part 3: push with the Golden-Rule rejection (slide 28).

import { isAncestor } from './commits.js';
import { needRepo } from './gitA.js';
import { remoteStore } from './gitJ.js';

function isAncestorEither(S, R, a, b) {
  const seen = new Set();
  const stack = [b];
  while (stack.length) {
    const s = stack.pop();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    if (s === a) return true;
    const c = S.repo.commits[s] || R.commits[s];
    if (c) stack.push(...c.parents);
  }
  return false;
}

export function cmdPush(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const force = args.includes('--force') || args.includes('-f');
  const setUp = args.includes('-u') || args.includes('--set-upstream');
  const nonFlag = args.filter((a) => !a.startsWith('-') && a !== '--');
  let remoteName = nonFlag[0] || Object.keys(r.remotes)[0] || 'origin';
  let branchName = nonFlag[1] || (r.head.type === 'branch' ? r.head.name : null);
  if (!r.remotes[remoteName]) {
    if (r.remotes.origin && nonFlag.length <= 1) {
      branchName = nonFlag[0] || branchName;
      remoteName = 'origin';
    } else {
      out.push({ text: `fatal: '${remoteName}' does not appear to be a git repository`, cls: 'err' });
      return;
    }
  }
  if (!branchName) {
    out.push({ text: 'usage: git push <remote> <branch>   (e.g.  git push origin main)', cls: 'err' });
    return;
  }
  const cfg = r.remotes[remoteName];
  const store = remoteStore(ctx);
  if (!store[cfg.url]) store[cfg.url] = { branches: { main: null }, commits: {}, files: {} };
  const R = store[cfg.url];
  const localTip = r.branches[branchName];
  if (!localTip) {
    out.push({ text: `error: src refspec ${branchName} does not match any local branch.`, cls: 'err' });
    return;
  }
  const remoteTip = R.branches[branchName] || null;
  if (remoteTip && remoteTip !== localTip && !isAncestorEither(S, R, remoteTip, localTip) && !force) {
    out.push({ text: `To ${cfg.url}`, cls: 'out' });
    out.push({ text: ` ! [rejected]        ${branchName} -> ${branchName} (fetch first)`, cls: 'err' });
    out.push({ text: 'error: failed to push some refs — the remote has commits you lack.', cls: 'err' });
    out.push({ text: 'hint: the Golden Rule — always  git pull  before  git push  to avoid conflicts.', cls: 'warn' });
    return;
  }
  void isAncestor;
  for (const [sha, c] of Object.entries(r.commits)) R.commits[sha] = JSON.parse(JSON.stringify(c));
  R.branches[branchName] = localTip;
  r.fetched = r.fetched || {};
  r.fetched[`${remoteName}/${branchName}`] = localTip;
  if (setUp) r.upstream[branchName] = `${remoteName}/${branchName}`;
  out.push({ text: `To ${cfg.url}`, cls: 'out' });
  out.push({ text: `   ${remoteTip ? remoteTip.slice(0, 7) : 'new branch'}  ${branchName} -> ${branchName}`, cls: 'out' });
  out.push({ text: 'Push accepted — your commits are now shared with the team.', cls: 'ok' });
}
