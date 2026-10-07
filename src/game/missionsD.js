// Chapter 4 — TIME TRAVEL (deck slides 21-23): log filters, diff, revert/restore.

import { silent, seedCommit, mkCheck } from './helpers.js';
import { statusOf } from '../git/stage.js';

export const missionsD = [
  {
    id: 'm09-log-detective',
    title: 'Log Detective',
    chapter: 'Time Travel',
    deck: 'Slide 21 · Git log',
    story: [
      'Three commits landed in April 2024. The bug report says "broke after Apr 2".',
      'The deck’s tools: git log -3 · git log --since/--until · git log <file> · git show <sha>.',
    ],
    goal: 'Use log filters to find which commit touched readme.md, then show it.',
    steps: [
      '1. Last 3 commits:  git log -3',
      '2. Only April 2024:  git log --since \'Apr 2 2024\' --until \'Apr 11 2024\'',
      '3. Only commits touching the file:  git log readme.md',
      '4. Show the culprit:  git show <sha>  (copy the short sha from the log).',
    ],
    hints: ['Combine: git log -3 readme.md works too.', 'git show prints metadata + diff.'],
    solution: ['git log -3', "git log --since 'Apr 2 2024' --until 'Apr 11 2024'", 'git log readme.md', 'git show HEAD'],
    setup(S, ctx) {
      silent(S, ctx, 'git init log-proj');
      silent(S, ctx, 'cd log-proj');
      seedCommit(S, ctx, 'Setup project', { 'readme.md': 'v1', 'app.py': 'ok' });
      seedCommit(S, ctx, 'Update readme with typo', { 'readme.md': 'v2 typo', 'app.py': 'ok' });
      seedCommit(S, ctx, 'Fix app bug', { 'readme.md': 'v2 typo', 'app.py': 'fixed' });
    },
    check: mkCheck([
      { label: 'you ran a filtered log (history shows it)', test: (S) => S.history.some((h) => h.startsWith('git log')) },
      { label: 'you inspected a commit with git show', test: (S) => S.history.some((h) => h.startsWith('git show')) },
    ]),
  },
  {
    id: 'm10-diff-lab',
    title: 'Spot the Difference',
    chapter: 'Time Travel',
    deck: 'Slide 22 · Git diff',
    story: [
      'Before you commit or revert, you COMPARE. git diff is the magnifying glass:',
      'unstaged vs staged, staged vs HEAD, commit vs commit, branch vs branch.',
    ],
    goal: 'Produce all three classic diffs: unstaged, staged, and commit-vs-commit.',
    steps: [
      '1. Edit the report:  set report.md "revenue UP 20%"  (or echo).',
      '2. Unstaged diff:  git diff report.md',
      '3. Stage and compare to HEAD:  git add report.md  then  git diff --staged report.md',
      '4. Commit it:  git commit -m "Update report"',
      '5. Compare the two newest commits:  git diff HEAD~1 HEAD',
    ],
    hints: ['HEAD~1 = "one commit before HEAD".', '+ lines added, - lines removed.'],
    solution: ['set report.md "revenue UP 20%"', 'git diff report.md', 'git add report.md', 'git diff --staged report.md', 'git commit -m "Update report"', 'git diff HEAD~1 HEAD'],
    setup(S, ctx) {
      silent(S, ctx, 'git init diff-proj');
      silent(S, ctx, 'cd diff-proj');
      seedCommit(S, ctx, 'Add report', { 'report.md': 'revenue flat' });
    },
    check: mkCheck([
      { label: 'a second commit exists ("Update report")', test: (S) => Object.values(S.repo.commits).some((c) => c.message === 'Update report') },
      { label: 'you ran git diff at least twice', test: (S) => S.history.filter((h) => h.startsWith('git diff')).length >= 2 },
    ]),
  },
  {
    id: 'm11-safe-undo',
    title: 'The Safe Undo',
    chapter: 'Time Travel',
    deck: 'Slide 23 · Git revert & restore',
    story: [
      'Revert = "reinstates previous versions and makes a commit". Restore = fix the file without committing.',
      'You pushed a bad change to notes.txt. Unpublish it the SAFE way (no history rewriting!).',
    ],
    goal: 'Revert HEAD without opening an editor, then unstage one file with restore.',
    steps: [
      '1. Confirm the damage:  git show HEAD',
      '2. Revert it:  git revert --no-edit HEAD  (adds a new commit — history kept!).',
      '3. Make a new mess:  set notes.txt "oops again"',
      '4. Stage it:  git add notes.txt',
      '5. Unstage WITHOUT losing the edit:  git restore --staged notes.txt',
      '6. Check:  git status  (notes.txt back to red/unstaged).',
    ],
    hints: ['git revert -n HEAD stages the undo WITHOUT committing — try it too.', 'restore --staged only unstages; your text stays in the file.'],
    solution: ['git revert --no-edit HEAD', 'git add notes.txt', 'git restore --staged notes.txt'],
    setup(S, ctx) {
      silent(S, ctx, 'git init undo-proj');
      silent(S, ctx, 'cd undo-proj');
      seedCommit(S, ctx, 'Good notes', { 'notes.txt': 'good notes' });
      seedCommit(S, ctx, 'Bad notes edit', { 'notes.txt': 'BAD notes' });
    },
    check: mkCheck([
      { label: 'HEAD is a Revert commit', test: (S) => S.repo.commits[S.repo.branches.main].message.startsWith('Revert') },
      { label: 'notes.txt edit is unstaged (not staged anymore)', test: (S) => !statusOf(S).staged.some((f) => f.path === 'notes.txt') },
    ]),
  },
];
