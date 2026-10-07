// Mission helpers: seed repos without polluting player history.
import { createState } from '../git/state.js';
import { runLine } from '../git/engine.js';
import { writeFile } from '../git/edit.js';

export function freshGame() {
  const S = createState();
  const ctx = { remoteStore: {} };
  return { S, ctx };
}

export function silent(S, ctx, line) {
  return runLine(S, line, ctx, { record: false });
}

export function seedFiles(S, files) {
  for (const [p, c] of Object.entries(files)) writeFile(S, p, c);
}

export function seedCommit(S, ctx, message, files) {
  if (files) seedFiles(S, files);
  silent(S, ctx, 'git add .');
  silent(S, ctx, `git commit -m "${message}"`);
}

export function mkCheck(items) {
  // items: [{label, test(S,ctx)->bool}]
  return (S, ctx) => items.map((it) => {
    let ok = false;
    try {
      ok = !!it.test(S, ctx);
    } catch {
      ok = false;
    }
    return { label: it.label, ok };
  });
}
