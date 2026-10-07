// Read-only porcelain: log, show, diff (deck slides 19-22).

import { norm, under, relOf } from './state.js';
import { headSha, resolveRev, fmtDate } from './commits.js';
import { needRepo } from './gitA.js';
import { formatFileDiff } from './diff.js';

function walkFrom(S, start, limit) {
  const out = [];
  const seen = new Set();
  const stack = start ? [start] : [];
  while (stack.length && (limit === null || out.length < limit)) {
    const s = stack.shift();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    const c = S.repo.commits[s];
    if (!c) continue;
    out.push(c);
    stack.push(...c.parents);
  }
  return out;
}

function printCommit(S, c, oneline, out) {
  if (oneline) {
    out.push({ text: `${c.sha.slice(0, 7)} ${c.message}`, cls: 'commit' });
    return;
  }
  out.push({ text: `commit ${c.sha} (${c.parents.map((p) => p.slice(0, 7)).join(' ') || 'root'})`, cls: 'commit' });
  out.push({ text: `Author: ${c.author} <${c.email}>`, cls: 'out' });
  out.push({ text: `Date:   ${fmtDate(c.time)}`, cls: 'out' });
  out.push({ text: '', cls: 'out' });
  out.push({ text: `    ${c.message}`, cls: 'out' });
  out.push({ text: '', cls: 'out' });
}

function parseMonthDayYear(s) {
  const m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if (!m) return null;
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const mi = months[m[1].slice(0, 3).toLowerCase()];
  if (mi === undefined) return null;
  return Date.UTC(parseInt(m[3] || '2024', 10), mi, parseInt(m[2], 10));
}

export function cmdLog(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const oneline = args.includes('--oneline');
  let limit = null;
  let since = null;
  let until = null;
  let file = null;
  const revs = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (/^-\d+$/.test(a)) limit = parseInt(a.slice(1), 10);
    else if (a.startsWith('--since=')) since = parseMonthDayYear(a.slice(8));
    else if (a === '--since' && i + 1 < args.length) {
      since = parseMonthDayYear(args[i + 1]);
      i += 1;
    } else if (a.startsWith('--until=')) until = parseMonthDayYear(a.slice(8));
    else if (a === '--until' && i + 1 < args.length) {
      until = parseMonthDayYear(args[i + 1]);
      i += 1;
    } else if (!a.startsWith('-') && a !== '--') {
      const abs = norm(S.cwd, a);
      if (under(S.repo.root, abs)) {
        const rel = relOf(S.repo.root, abs);
        const looksLikeFile = rel.includes('.') || S.files.has(abs);
        if (looksLikeFile) file = rel;
        else revs.push(a);
      } else revs.push(a);
    }
  }
  let start = headSha(S);
  if (revs.length) {
    const s = resolveRev(S, revs[0]);
    if (!s) {
      out.push({ text: `fatal: bad revision '${revs[0]}'`, cls: 'err' });
      return;
    }
    start = s;
  }
  let list = walkFrom(S, start, null);
  if (file) {
    list = list.filter((c) => {
      const parent = c.parents.length ? S.repo.commits[c.parents[0]].tree : {};
      return (c.tree[file] === undefined ? null : c.tree[file]) !== (parent[file] === undefined ? null : parent[file]);
    });
  }
  if (since !== null) list = list.filter((c) => Date.parse(c.time) >= (since || 0));
  if (until !== null) list = list.filter((c) => Date.parse(c.time) <= (until || Date.now()) + 86400000);
  if (limit !== null) list = list.slice(0, limit);
  if (!list.length) {
    out.push({ text: 'No commits match these filters.', cls: 'dim' });
    return;
  }
  for (const c of list) printCommit(S, c, oneline, out);
}

export function cmdShow(S, args, ctx, out) {
  if (!needRepo(S, out)) return;
  const rev = args.find((a) => !a.startsWith('-')) || 'HEAD';
  const sha = resolveRev(S, rev);
  if (!sha || !S.repo.commits[sha]) {
    out.push({ text: `fatal: bad revision '${rev}'`, cls: 'err' });
    return;
  }
  const c = S.repo.commits[sha];
  printCommit(S, c, false, out);
  const parent = c.parents.length ? S.repo.commits[c.parents[0]].tree : {};
  const paths = new Set([...Object.keys(parent), ...Object.keys(c.tree)]);
  for (const p of paths) {
    const pv = p in parent ? parent[p] : undefined;
    const cv = p in c.tree ? c.tree[p] : undefined;
    if (pv === cv) continue;
    for (const l of formatFileDiff(p, pv, cv)) {
      const cls = l.startsWith('+') && !l.startsWith('+++') ? 'add' : l.startsWith('-') && !l.startsWith('---') ? 'del' : 'dim';
      out.push({ text: l, cls });
    }
  }
}
