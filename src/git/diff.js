// Line-diff (LCS) used by git diff / git show.

export function diffLines(oldStr, newStr) {
  const a = oldStr === '' ? [] : String(oldStr).split('\n');
  const b = newStr === '' ? [] : String(newStr).split('\n');
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ t: ' ', s: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: '-', s: a[i] });
      i += 1;
    } else {
      ops.push({ t: '+', s: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ t: '-', s: a[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ t: '+', s: b[j] });
    j += 1;
  }
  return ops;
}

export function formatFileDiff(path, oldStr, newStr) {
  const lines = [`diff --git a/${path} b/${path}`];
  const oldExists = oldStr !== undefined && oldStr !== null;
  const newExists = newStr !== undefined && newStr !== null;
  if (!oldExists && newExists) lines.push('new file mode 100644');
  if (oldExists && !newExists) lines.push('deleted file mode 100644');
  lines.push(`--- a/${path}`, `+++ b/${path}`);
  const oldCount = oldExists ? String(oldStr).split('\n').length : 0;
  const newCount = newExists ? String(newStr).split('\n').length : 0;
  lines.push(`@@ -1,${oldCount} +1,${newCount} @@`);
  for (const o of diffLines(oldExists ? oldStr : '', newExists ? newStr : '')) lines.push(`${o.t}${o.s}`);
  return lines;
}
