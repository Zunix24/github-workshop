// Core porcelain, part 2: status + add.

import { norm, under, relOf } from './state.js';
import { headSha, headTree } from './commits.js';
import { workTree, statusOf } from './stage.js';
import { needRepo } from './gitA.js';

export { workTree, statusOf };

export function cmdStatus(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const r = S.repo;
  const st = statusOf(S);
  const branch = r.head.type === 'branch' ? r.head.name : `(detached HEAD at ${String(headSha(S)).slice(0, 7)})`;
  out.push({ text: `On branch ${branch}`, cls: 'out' });
  if (r.rebase) out.push({ text: 'You are currently rebasing.  (git rebase --continue / --skip / --abort)', cls: 'warn' });
  if (r.mergeHead) out.push({ text: 'You have unmerged paths.  (fix conflicts, git add, then git commit)', cls: 'warn' });
  const up = r.upstream[branch];
  if (r.head.type === 'branch' && up) out.push({ text: `Your branch is up to date with '${up}'.`, cls: 'out' });
  if (!st.staged.length && !st.unstaged.length && !st.untracked.length && !st.conflicted.length) {
    out.push({ text: 'nothing to commit, working tree clean', cls: 'out' });
    return;
  }
  if (st.conflicted.length) {
    out.push({ text: 'Unmerged paths:', cls: 'err' });
    out.push({ text: '  (use "git add <file>..." to mark resolution)', cls: 'dim' });
    for (const f of st.conflicted) out.push({ text: `\tboth modified:   ${f.path}`, cls: 'err' });
  }
  if (st.staged.length) {
    out.push({ text: 'Changes to be committed:', cls: 'out' });
    out.push({ text: '  (use "git restore --staged <file>..." to unstage)', cls: 'dim' });
    for (const f of st.staged) {
      const label = f.kind === 'A' ? 'new file:' : f.kind === 'D' ? 'deleted:' : 'modified:';
      out.push({ text: `\t${label}   ${f.path}`, cls: 'ok' });
    }
  }
  if (st.unstaged.length) {
    out.push({ text: 'Changes not staged for commit:', cls: 'out' });
    out.push({ text: '  (use "git add <file>..." to update what will be committed)', cls: 'dim' });
    for (const f of st.unstaged) {
      const label = f.kind === 'D' ? 'deleted:' : 'modified:';
      out.push({ text: `\t${label}   ${f.path}`, cls: 'out' });
    }
  }
  if (st.untracked.length) {
    out.push({ text: 'Untracked files:', cls: 'err' });
    out.push({ text: '  (use "git add <file>..." to include in what will be committed)', cls: 'dim' });
    for (const f of st.untracked) out.push({ text: `\t${f.path}`, cls: 'err' });
  }
  if (!st.staged.length) out.push({ text: 'no changes added to commit (use "git add" and/or "git commit -a")', cls: 'dim' });
}

export function stagePath(S, rel) {
  const r = S.repo;
  const abs = r.root === '/' ? `/${rel}` : `${r.root}/${rel}`;
  const head = headTree(S);
  if (S.files.has(abs)) r.index[rel] = S.files.get(abs);
  else if (rel in head || rel in r.index) r.index[rel] = null; // staged deletion
}

export function cmdAdd(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  if (!args.length || args.includes('-h')) {
    out.push({ text: 'usage: git add <file>  |  git add .   (stages new + modified files)', cls: 'err' });
    return;
  }
  const r = S.repo;
  const head = headTree(S);
  const work = workTree(S);
  const targets = args.filter((a) => a !== '-A' && a !== '-u' && a !== '--all');
  const everything = targets.length === 0 || targets.includes('.') || targets.includes('./');
  if (everything) {
    for (const p of Object.keys(work)) stagePath(S, p);
    for (const p of Object.keys(head)) {
      const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
      if (!S.files.has(abs)) r.index[p] = null;
    }
    for (const p of Object.keys(r.index)) {
      if (!(p in work) && !(p in head)) delete r.index[p];
    }
  } else {
    for (const t of targets) {
      const abs = norm(S.cwd, t);
      if (!under(r.root, abs)) {
        out.push({ text: `fatal: ${t}: outside repository at '${r.root}'`, cls: 'err' });
        return;
      }
      const rel = relOf(r.root, abs);
      const isDir = [...S.files.keys()].some((k) => k.startsWith(`${abs}/`)) || S.dirs.has(abs);
      if (isDir) {
        let n = 0;
        for (const p of Object.keys(work)) {
          if (p === rel || p.startsWith(`${rel}/`)) {
            stagePath(S, p);
            n += 1;
          }
        }
        if (!n) {
          out.push({ text: `fatal: pathspec '${t}' did not match any files`, cls: 'err' });
          return;
        }
      } else if (S.files.has(abs) || rel in head || rel in r.index) {
        stagePath(S, rel);
      } else {
        out.push({ text: `fatal: pathspec '${t}' did not match any files`, cls: 'err' });
        return;
      }
    }
  }
  if (r.conflicts) {
    for (const p of Object.keys(r.conflicts)) {
      const abs = r.root === '/' ? `/${p}` : `${r.root}/${p}`;
      if (S.files.has(abs) && !S.files.get(abs).includes('<<<<<<<')) delete r.conflicts[p];
    }
    if (!Object.keys(r.conflicts).length) {
      r.conflicts = null;
      out.push({ text: 'All conflicts fixed but you are still merging.  (use "git commit" to conclude the merge)', cls: 'ok' });
    }
  }
}
