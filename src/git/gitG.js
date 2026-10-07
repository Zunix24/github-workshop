// Branch porcelain: branch, switch, checkout (deck slide 24).

import { headSha } from './commits.js';
import { needRepo } from './gitA.js';
import { checkoutTree } from './gitD.js';

export function cmdBranch(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const flags = args.filter((a) => a.startsWith('-'));
  const names = args.filter((a) => !a.startsWith('-'));
  if (flags.includes('-d') || flags.includes('-D')) {
    const force = flags.includes('-D');
    const name = names[0];
    if (!name || !(name in r.branches)) {
      out.push({ text: `error: branch '${name || ''}' not found.`, cls: 'err' });
      return;
    }
    if (r.head.type === 'branch' && r.head.name === name) {
      out.push({ text: `error: cannot delete branch '${name}' checked out here.`, cls: 'err' });
      return;
    }
    void force;
    delete r.branches[name];
    out.push({ text: `Deleted branch ${name}.`, cls: 'ok' });
    return;
  }
  if (names.length === 0) {
    const list = Object.keys(r.branches).sort();
    if (!list.length) {
      out.push({ text: 'No branches yet — commit something first.', cls: 'dim' });
      return;
    }
    for (const b of list) {
      const cur = r.head.type === 'branch' && r.head.name === b;
      const sha = r.branches[b];
      out.push({ text: `${cur ? '*' : ' '} ${b}${sha ? `  ${sha.slice(0, 7)} ${S.repo.commits[sha].message}` : '  (no commits yet)'}`, cls: cur ? 'ok' : 'out' });
    }
    return;
  }
  const name = names[0];
  if (!/^[A-Za-z0-9._/-]+$/.test(name)) {
    out.push({ text: `fatal: '${name}' is not a valid branch name`, cls: 'err' });
    return;
  }
  if (name in r.branches) {
    out.push({ text: `fatal: a branch named '${name}' already exists`, cls: 'err' });
    return;
  }
  r.branches[name] = headSha(S);
  out.push({ text: `Created branch '${name}' at ${r.branches[name] ? r.branches[name].slice(0, 7) : '(unborn HEAD)'}.`, cls: 'ok' });
}

export function doSwitch(S, name, create, out) {
  const r = S.repo;
  if (create) {
    if (name in r.branches) {
      out.push({ text: `fatal: a branch named '${name}' already exists`, cls: 'err' });
      return;
    }
    r.branches[name] = headSha(S);
  } else if (!(name in r.branches)) {
    out.push({ text: `error: pathspec '${name}' did not match any branch known to git`, cls: 'err' });
    return;
  }
  if (r.head.type === 'branch' && r.head.name === name) {
    out.push({ text: `Already on '${name}'`, cls: 'dim' });
    return;
  }
  const targetTree = r.branches[name] ? r.commits[r.branches[name]].tree : {};
  try {
    checkoutTree(S, targetTree);
  } catch (e) {
    if (create) delete r.branches[name];
    out.push({ text: e.message, cls: 'err' });
    return;
  }
  r.head = { type: 'branch', name };
  out.push({ text: `Switched to ${create ? 'a new ' : ''}branch '${name}'`, cls: 'ok' });
}

export function cmdSwitch(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  if (S.repo.rebase) {
    out.push({ text: 'fatal: cannot switch branches while rebasing.', cls: 'err' });
    return;
  }
  let create = false;
  let name = null;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '-c' || a === '--create') {
      create = true;
      if (i + 1 < args.length) {
        name = args[i + 1];
        i += 1;
      }
    } else if (!a.startsWith('-') && !name) name = a;
  }
  if (!name) {
    out.push({ text: 'usage: git switch <branch>  |  git switch -c <new-branch>', cls: 'err' });
    return;
  }
  doSwitch(S, name, create, out);
}

export function cmdCheckout(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  if (S.repo.rebase) {
    out.push({ text: 'fatal: cannot switch branches while rebasing.', cls: 'err' });
    return;
  }
  let nb = false;
  let target = null;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '-b') {
      nb = true;
      if (i + 1 < args.length) {
        target = args[i + 1];
        i += 1;
      }
    } else if (a === '--') continue;
    else if (!a.startsWith('-') && !target) target = a;
  }
  if (!target) {
    out.push({ text: 'usage: git checkout <branch>  |  git checkout -b <new-branch>', cls: 'err' });
    return;
  }
  // deck: checkout creates AND switches to a branch
  if (nb || target in S.repo.branches) {
    doSwitch(S, target, nb, out);
    return;
  }
  out.push({ text: `error: pathspec '${target}' did not match any branch known to git`, cls: 'err' });
  out.push({ text: 'hint: create it first with  git checkout -b <name>  (or  git switch -c <name>)', cls: 'dim' });
}
