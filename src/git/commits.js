// Commit-graph helpers: sha gen, dates, HEAD resolution, ancestry, merges.

import { BASE_TIME } from './state.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function tick(S) {
  S.seq += 1;
  return new Date(BASE_TIME + S.seq * 3600 * 1000);
}

export function nextSha(S) {
  const h = ((S.seq * 2654435761 + 0x9e3779b9) >>> 0).toString(16).padStart(8, '0');
  return h.slice(0, 7);
}

export function fmtDate(d) {
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${DAYS[dt.getUTCDay()]} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}:${p(dt.getUTCSeconds())} ${dt.getUTCFullYear()} +0000`;
}

export function headSha(S) {
  const r = S.repo;
  if (!r) return null;
  if (r.head.type === 'branch') return r.branches[r.head.name] || null;
  return r.detachedTip || null;
}

export function headTree(S) {
  const sha = headSha(S);
  if (!sha) return {};
  return { ...(S.repo.commits[sha]?.tree || {}) };
}

export function resolveRev(S, rev) {
  const r = S.repo;
  if (!rev || rev === 'HEAD') return headSha(S);
  if (rev === '@') return headSha(S);
  const m = rev.match(/^(HEAD|@)~(\d+)$/);
  if (m) {
    let sha = headSha(S);
    let n = parseInt(m[2], 10);
    while (sha && n > 0) {
      const c = r.commits[sha];
      sha = c && c.parents.length ? c.parents[0] : null;
      n -= 1;
    }
    return sha;
  }
  if (r.branches[rev] !== undefined) return r.branches[rev] || null;
  if (rev.includes('/')) {
    const i = rev.indexOf('/');
    const rn = rev.slice(0, i);
    const b = rev.slice(i + 1);
    if (r.remotes[rn] && r.remotes[rn].branches[b] !== undefined) return r.remotes[rn].branches[b];
  }
  const hits = Object.keys(r.commits).filter((s) => s.startsWith(rev));
  if (hits.length === 1) return hits[0];
  return null;
}

export function ancestors(S, sha) {
  const seen = new Set();
  const stack = [sha];
  while (stack.length) {
    const s = stack.pop();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    const c = S.repo.commits[s];
    if (c) stack.push(...c.parents);
  }
  return seen;
}

export function isAncestor(S, a, b) {
  if (!a || !b) return false;
  return ancestors(S, b).has(a);
}

export function mergeBase(S, a, b) {
  if (!a || !b) return null;
  const aa = ancestors(S, a);
  const queue = [b];
  const seen = new Set();
  while (queue.length) {
    const s = queue.shift();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    if (aa.has(s)) return s;
    const c = S.repo.commits[s];
    if (c) queue.push(...c.parents);
  }
  return null;
}

export function commitNow(S, message, parents, tree) {
  const r = S.repo;
  const time = tick(S).toISOString();
  const sha = nextSha(S);
  r.commits[sha] = {
    sha, parents: [...parents], message,
    author: r.user.name, email: r.user.email, time, tree: { ...tree },
  };
  if (r.head.type === 'branch') r.branches[r.head.name] = sha;
  else r.detachedTip = sha;
  r.index = {};
  r.conflicts = null;
  return sha;
}

