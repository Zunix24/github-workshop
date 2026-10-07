// Core porcelain, part 1: init, config, status.
// Signature: cmdX(S, args, ctx, out) — pushes {text, cls} lines into out.

import { norm, under, ensureDir } from './state.js';

export function needRepo(S, out) {
  if (!S.repo || !under(S.repo.root, S.cwd)) {
    out.push({ text: 'fatal: not a git repository (or any of the parent directories): .git', cls: 'err' });
    return false;
  }
  return true;
}

export function blankRepo(root, user) {
  return {
    root,
    user: user || { name: 'GitQuest Player', email: 'player@gitquest.local' },
    commits: {},
    branches: { main: null },
    head: { type: 'branch', name: 'main' },
    detachedTip: null,
    index: {},
    mergeHead: null,
    conflicts: null,
    rebase: null,
    remotes: {},
    upstream: {},
    credHelper: '',
  };
}

export function cmdInit(S, args, ctx, out) {
  const target = args[0] ? norm(S.cwd, args[0]) : S.cwd;
  if (S.repo && under(S.repo.root, S.cwd)) {
    out.push({ text: `Reinitialized existing Git repository in ${S.repo.root}/.git/`, cls: 'out' });
    return;
  }
  ensureDir(S, target);
  S.repo = blankRepo(target);
  if (args[0]) {
    out.push({ text: 'Initialized empty Git repository — now step inside it:', cls: 'out' });
    out.push({ text: `  cd ${args[0]}`, cls: 'ok' });
  } else {
    out.push({ text: `Initialized empty Git repository in ${target}/.git/`, cls: 'out' });
  }
  out.push({ text: 'Hands off .git/ — it is Git\'s private database. Edit your files, not its internals.', cls: 'dim' });
}

export function cmdConfig(S, args, ctx, out) {
  if (!S.repo) {
    out.push({ text: 'warning: no repository yet — identity will be stored globally anyway.', cls: 'warn' });
  }
  const a = args.filter((x) => x !== '--global' && x !== '--local');
  if (a.length === 0 || a[0] === '--list' || a[0] === '-l') {
    const u = S.repo ? S.repo.user : { name: '', email: '' };
    out.push({ text: `user.name=${u.name}`, cls: 'out' });
    out.push({ text: `user.email=${u.email}`, cls: 'out' });
    if (S.repo && S.repo.credHelper) out.push({ text: `credential.helper=${S.repo.credHelper}`, cls: 'out' });
    return;
  }
  if (a[0] === '--get' && a[1]) {
    const key = a[1];
    if (key === 'user.name') out.push({ text: S.repo ? S.repo.user.name : '', cls: 'out' });
    else if (key === 'user.email') out.push({ text: S.repo ? S.repo.user.email : '', cls: 'out' });
    else if (key === 'credential.helper') out.push({ text: S.repo ? S.repo.credHelper : '', cls: 'out' });
    else out.push({ text: '', cls: 'out' });
    return;
  }
  if (a.length >= 2 && !a[0].startsWith('-')) {
    const key = a[0];
    const value = a.slice(1).join(' ');
    if (key === 'user.name' || key === 'user.email' || key === 'credential.helper') {
      if (!S.repo) S.repo = blankRepo(S.cwd);
      if (key === 'user.name') S.repo.user.name = value;
      else if (key === 'user.email') S.repo.user.email = value;
      else S.repo.credHelper = value;
      out.push({ text: `Set ${key} = ${value}`, cls: 'ok' });
      return;
    }
  }
  out.push({ text: 'usage: git config --global user.name "Your Name"  |  user.email "you@example.com"  |  credential.helper store', cls: 'err' });
}
