// File editing helpers: set/edit/nano, rm, touch.

import { norm, ensureDir } from './state.js';

export function writeFile(S, rel, content) {
  const abs = norm(S.cwd, rel);
  ensureDir(S, abs.slice(0, abs.lastIndexOf('/')) || '/');
  S.files.set(abs, content);
}

export function cmdSet(S, args, ctx, out, rawArgs) {
  // set <file> <line...>  — replace whole file content (simplest editor)
  if (args.length < 1) {
    out.push({ text: 'usage: set <file> <text...>   (replaces the whole file)', cls: 'err' });
    return;
  }
  writeFile(S, args[0], rawArgs.slice(1).join(' '));
  out.push({ text: `Wrote ${args[0]}.`, cls: 'ok' });
}

export function cmdEdit(S, args, ctx, out, rawArgs) {
  // edit <file> <old> => <new>  — substring replace (for conflict resolution)
  const arrow = rawArgs.indexOf('=>');
  if (args.length < 1 || arrow === -1) {
    out.push({ text: 'usage: edit <file> <old-text> => <new-text>', cls: 'err' });
    return;
  }
  const file = args[0];
  const abs = norm(S.cwd, file);
  if (!S.files.has(abs)) {
    out.push({ text: `edit: ${file}: No such file`, cls: 'err' });
    return;
  }
  const oldText = rawArgs.slice(1, arrow).join(' ');
  const newText = rawArgs.slice(arrow + 1).join(' ');
  const cur = S.files.get(abs);
  if (!cur.includes(oldText)) {
    out.push({ text: 'edit: old text not found in file. cat the file and copy it exactly.', cls: 'err' });
    return;
  }
  S.files.set(abs, cur.replace(oldText, newText));
  out.push({ text: `Edited ${file}.`, cls: 'ok' });
}

export function cmdNano(S, args, ctx, out, rawArgs) {
  // nano <file> [initial text...] — appends lines (workshop "nano script.py")
  if (!args.length) {
    out.push({ text: 'usage: nano <file> [text...]   (appends text to the file)', cls: 'err' });
    return;
  }
  const abs = norm(S.cwd, args[0]);
  ensureDir(S, abs.slice(0, abs.lastIndexOf('/')) || '/');
  const extra = rawArgs.slice(1).join(' ');
  const cur = S.files.get(abs) || '';
  S.files.set(abs, cur ? (extra ? `${cur}\n${extra}` : cur) : extra);
  out.push({ text: cur ? `Appended to ${args[0]}.` : `Created ${args[0]}.`, cls: 'ok' });
}

export function cmdTouch(S, args, ctx, out) {
  const files = args.filter((a) => !a.startsWith('-'));
  if (!files.length) {
    out.push({ text: 'usage: touch <file>...', cls: 'err' });
    return;
  }
  for (const f of files) {
    const abs = norm(S.cwd, f);
    if (!S.files.has(abs)) {
      ensureDir(S, abs.slice(0, abs.lastIndexOf('/')) || '/');
      S.files.set(abs, '');
    }
  }
}

export function cmdRm(S, args, ctx, out) {
  const files = args.filter((a) => !a.startsWith('-') && a !== '-r' && a !== '-rf');
  if (!files.length) {
    out.push({ text: 'usage: rm <file>...', cls: 'err' });
    return;
  }
  for (const f of files) {
    const abs = norm(S.cwd, f);
    if (S.files.has(abs)) S.files.delete(abs);
    else out.push({ text: `rm: cannot remove '${f}': No such file`, cls: 'err' });
  }
}
