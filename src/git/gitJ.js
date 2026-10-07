// Remote porcelain (deck slides 16-17, 28-29): remote + clone.
// fetch/pull live in gitK.js, push in gitL.js.
// Remotes live inside the same simulated world: ctx.remoteStore is a global
// registry url -> { branches, commits } so clone/pull/push feel real.

import { norm, ensureDir } from './state.js';
import { blankRepo, needRepo } from './gitA.js';

export function remoteStore(ctx) {
  if (!ctx.remoteStore) ctx.remoteStore = {};
  return ctx.remoteStore;
}

export function seedRemote(ctx, url, setup) {
  const store = remoteStore(ctx);
  if (store[url]) return store[url];
  const R = { branches: { main: null }, commits: {}, files: {} };
  store[url] = R;
  if (setup) setup(R);
  return R;
}

function importRemoteCommits(S, R) {
  for (const [sha, c] of Object.entries(R.commits)) {
    if (!S.repo.commits[sha]) S.repo.commits[sha] = JSON.parse(JSON.stringify(c));
  }
}

export function cmdRemote(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  if (!args.length || args[0] === '-v' || args[0] === '--verbose') {
    const names = Object.keys(S.repo.remotes);
    if (!names.length) {
      out.push({ text: 'No remotes configured. Add one:  git remote add origin <url>', cls: 'dim' });
      return;
    }
    for (const n of names) {
      out.push({ text: `${n}\t${S.repo.remotes[n].url} (fetch)`, cls: 'out' });
      out.push({ text: `${n}\t${S.repo.remotes[n].url} (push)`, cls: 'out' });
    }
    return;
  }
  if (args[0] === 'add' && args[1] && args[2]) {
    const store = remoteStore(ctx);
    if (!store[args[2]]) store[args[2]] = { branches: { main: null }, commits: {}, files: {} };
    S.repo.remotes[args[1]] = { url: args[2] };
    out.push({ text: `Remote '${args[1]}' -> ${args[2]} registered.`, cls: 'ok' });
    return;
  }
  out.push({ text: 'usage: git remote  |  git remote add <name> <url>', cls: 'err' });
}

export function cmdClone(S, args, ctx, out) {
  const nonFlag = args.filter((a) => !a.startsWith('-'));
  if (!nonFlag.length) {
    out.push({ text: 'usage: git clone <url> [directory]   (no git init needed — clone does it)', cls: 'err' });
    return;
  }
  const url = nonFlag[0];
  const store = remoteStore(ctx);
  const R = store[url];
  if (!R) {
    out.push({ text: `fatal: repository '${url}' not found in this simulated world.`, cls: 'err' });
    out.push({ text: 'hint: available remotes appear in each mission briefing, e.g.  origin  or  https://github.com/...', cls: 'dim' });
    return;
  }
  let dest = nonFlag[1] || url.split('/').filter(Boolean).pop().replace(/\.git$/, '') || 'repo';
  dest = dest.replace(/\/$/, '');
  const abs = norm(S.cwd, dest);
  ensureDir(S, abs);
  S.repo = blankRepo(abs);
  importRemoteCommits(S, R);
  S.repo.remotes.origin = { url };
  const remoteBranches = Object.keys(R.branches);
  const main = remoteBranches.includes('main') ? 'main' : remoteBranches[0];
  S.repo.head = { type: 'branch', name: main };
  S.repo.branches = {};
  for (const b of remoteBranches) {
    const tip = R.branches[b];
    S.repo.branches[b] = tip;
    S.repo.upstream[b] = `origin/${b}`;
  }
  const tip = R.branches[main];
  const tree = tip ? R.commits[tip].tree : {};
  for (const p of Object.keys(tree)) S.files.set(abs === '/' ? `/${p}` : `${abs}/${p}`, tree[p]);
  S.cwd = abs;
  out.push({ text: `Cloning into '${dest}'...`, cls: 'out' });
  out.push({ text: `remote: ${Object.keys(R.commits).length} objects, done.`, cls: 'dim' });
  out.push({ text: `You are on branch '${main}', tracking origin/${main}. (git init was NOT needed — clone set it all up.)`, cls: 'ok' });
}
