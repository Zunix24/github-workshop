// Shared state + pure helpers for the GitQuest simulated git engine.

export const BASE_TIME = Date.UTC(2024, 3, 2, 9, 0, 0); // Tue Apr 2 2024

export function createState() {
  return {
    cwd: '/',
    dirs: new Set(['/']),
    files: new Map(), // absPath -> content (whole virtual disk)
    repo: null,
    history: [], // commands typed
    seq: 0, // global tick: commit time + sha uniqueness
  };
}

export function norm(cwd, p) {
  if (p === undefined || p === null || p === '' || p === '.') return cwd;
  if (p === '~') return '/';
  let parts;
  if (p.startsWith('/')) parts = p.split('/');
  else if (p.startsWith('~/')) parts = `/${p.slice(2)}`.split('/');
  else parts = `${cwd}/${p}`.split('/');
  const out = [];
  for (const s of parts) {
    if (!s || s === '.') continue;
    if (s === '..') {
      out.pop();
      continue;
    }
    out.push(s);
  }
  return `/${out.join('/')}`;
}

export function under(root, abs) {
  if (root === '/') return true;
  return abs === root || abs.startsWith(`${root}/`);
}

export function relOf(root, abs) {
  if (abs === root) return '';
  if (root === '/') return abs.replace(/^\//, '');
  return abs.slice(root.length + 1);
}

export function ensureDir(S, abs) {
  const parts = abs.split('/').filter(Boolean);
  let cur = '';
  for (const part of parts) {
    cur += `/${part}`;
    S.dirs.add(cur);
  }
}
