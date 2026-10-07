// Tiny virtual-disk shell so missions can create/edit files.

import { norm, under, ensureDir } from './state.js';

function children(S, abs) {
  const dirs = new Set();
  const files = new Set();
  const prefix = abs === '/' ? '/' : `${abs}/`;
  for (const d of S.dirs) {
    if (d !== abs && d.startsWith(prefix)) {
      const rest = d.slice(prefix.length);
      if (rest && !rest.includes('/')) dirs.add(rest);
    }
  }
  for (const f of S.files.keys()) {
    if (f.startsWith(prefix)) {
      const rest = f.slice(prefix.length);
      if (rest && !rest.includes('/')) files.add(rest);
    }
  }
  return { dirs: [...dirs].sort(), files: [...files].sort() };
}

export function cmdPwd(S, args, ctx, out) {
  out.push({ text: S.cwd, cls: 'out' });
}

export function cmdLs(S, args, ctx, out) {
  const target = args.find((a) => !a.startsWith('-')) || S.cwd;
  const abs = norm(S.cwd, target);
  if (S.files.has(abs)) {
    out.push({ text: abs.split('/').pop(), cls: 'out' });
    return;
  }
  if (!S.dirs.has(abs) && ![...S.files.keys()].some((k) => k.startsWith(`${abs}/`))) {
    out.push({ text: `ls: cannot access '${target}': No such file or directory`, cls: 'err' });
    return;
  }
  const { dirs, files } = children(S, abs);
  if (!dirs.length && !files.length) return;
  out.push({ text: [...dirs.map((d) => `${d}/`), ...files].join('   '), cls: 'out' });
}

export function cmdCd(S, args, ctx, out) {
  const dest = args[0] || '/';
  const abs = norm(S.cwd, dest);
  if (S.files.has(abs)) {
    out.push({ text: `bash: cd: ${dest}: Not a directory`, cls: 'err' });
    return;
  }
  if (!S.dirs.has(abs)) {
    out.push({ text: `bash: cd: ${dest}: No such file or directory`, cls: 'err' });
    return;
  }
  if (S.repo && under(S.repo.root, abs)) void 0;
  S.cwd = abs;
}

export function cmdMkdir(S, args, ctx, out) {
  const dirs = args.filter((a) => !a.startsWith('-'));
  if (!dirs.length) {
    out.push({ text: 'usage: mkdir <directory>...', cls: 'err' });
    return;
  }
  for (const d of dirs) {
    const abs = norm(S.cwd, d);
    if (S.files.has(abs)) {
      out.push({ text: `mkdir: cannot create directory '${d}': File exists`, cls: 'err' });
      continue;
    }
    ensureDir(S, abs);
  }
}

export function cmdCat(S, args, ctx, out) {
  const files = args.filter((a) => !a.startsWith('-'));
  if (!files.length) {
    out.push({ text: 'usage: cat <file>...', cls: 'err' });
    return;
  }
  for (const f of files) {
    const abs = norm(S.cwd, f);
    if (S.dirs.has(abs) && !S.files.has(abs)) {
      out.push({ text: `cat: ${f}: Is a directory`, cls: 'err' });
      continue;
    }
    if (!S.files.has(abs)) {
      out.push({ text: `cat: ${f}: No such file or directory`, cls: 'err' });
      continue;
    }
    for (const line of S.files.get(abs).split('\n')) out.push({ text: line, cls: 'out' });
  }
}

// echo <text...> [> or >> <file>] — quotes respected by the tokenizer
export function cmdEcho(S, args, ctx, out, rawArgs) {
  const gt = rawArgs.indexOf('>');
  const append = rawArgs.indexOf('>>');
  let text;
  let dest = null;
  let mode = 'write';
  if (append !== -1) {
    text = rawArgs.slice(0, append).join(' ');
    dest = rawArgs[append + 1];
    mode = 'append';
  } else if (gt !== -1) {
    text = rawArgs.slice(0, gt).join(' ');
    dest = rawArgs[gt + 1];
  } else {
    out.push({ text: rawArgs.join(' '), cls: 'out' });
    return;
  }
  if (!dest) {
    out.push({ text: 'bash: syntax error near unexpected token `newline`', cls: 'err' });
    return;
  }
  const abs = norm(S.cwd, dest);
  ensureDir(S, abs.slice(0, abs.lastIndexOf('/')) || '/');
  if (mode === 'append' && S.files.has(abs)) S.files.set(abs, `${S.files.get(abs)}\n${text}`);
  else S.files.set(abs, text);
}
