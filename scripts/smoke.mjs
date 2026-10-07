// Smoke test: replays every non-quiz mission's solution against its own checks,
// and validates quiz schemas. Run: node scripts/smoke.mjs
import { MISSIONS } from '../src/game/index.js';
import { freshGame } from '../src/game/helpers.js';
import { runLine } from '../src/git/engine.js';

let failures = 0;
const rows = [];

for (const m of MISSIONS) {
  if (m.kind === 'quiz') {
    const valid =
      Array.isArray(m.questions) &&
      m.questions.length > 0 &&
      m.questions.every(
        (q) => Number.isInteger(q.answer) && q.choices && q.choices.length >= 2 && q.choices[q.answer] !== undefined,
      );
    rows.push([m.id, valid ? 'OK (quiz schema)' : 'FAIL (quiz schema)']);
    if (!valid) failures += 1;
    continue;
  }
  const { S, ctx } = freshGame();
  try {
    m.setup(S, ctx);
    for (const cmd of m.solution) runLine(S, cmd, ctx, {});
    const checks = m.check(S, ctx);
    const bad = checks.filter((c) => !c.ok);
    if (bad.length) {
      failures += 1;
      rows.push([m.id, 'FAIL -> ' + bad.map((b) => b.label).join('; ')]);
    } else {
      rows.push([m.id, `OK (${checks.length} checks)`]);
    }
  } catch (e) {
    failures += 1;
    rows.push([m.id, 'ERROR -> ' + e.message]);
  }
}

for (const [id, res] of rows) {
  const mark = res.startsWith('OK') ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${id.padEnd(24)} ${res}`);
}
console.log(`\n${rows.length - failures}/${rows.length} missions passed`);
process.exit(failures ? 1 : 0);
